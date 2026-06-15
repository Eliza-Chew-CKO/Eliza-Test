import { runQuery, tbl, BQ } from '../lib/bigquery';
import { DashboardFilters, lastCompletedMonthStart } from '../middleware/filters';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface RepLeaderboardRow {
  rank: number;
  repName: string;
  mrYTD: number;
  mrLastMonth: number;
  mrYTDPct: number;
  tpvYTD: number;
  dealCount: number;
}

export async function getRepMRLeaderboard(filters: DashboardFilters): Promise<RepLeaderboardRow[]> {
  const { startDate, endDate, tier } = filters;
  const lcmStart = lastCompletedMonthStart();
  const lcmEnd   = new Date(Date.UTC(lcmStart.getUTCFullYear(), lcmStart.getUTCMonth() + 1, 0));

  const tierClause = tier ? `AND tier = @tier` : '';

  const sql = `
    WITH financials AS (
      SELECT
        sales_rep_name,
        SUM(IF(reporting_month BETWEEN @sd AND @ed, total_fee_inc_gross_fx, 0))  AS mr_ytd,
        SUM(IF(reporting_month BETWEEN @lcms AND @lcme, total_fee_inc_gross_fx, 0)) AS mr_last_month,
        SUM(IF(reporting_month BETWEEN @sd AND @ed, tpv_amount, 0))              AS tpv_ytd
      FROM ${tbl(BQ.financials)}
      WHERE go_live_region = 'NORAM'
        AND NOT UPPER(IFNULL(referral_partner, '')) LIKE '%SOLIDGATE%'
        ${tierClause}
      GROUP BY sales_rep_name
    ),
    deals AS (
      SELECT
        sales_rep_name,
        COUNT(*) AS deal_count
      FROM ${tbl(BQ.opportunities)}
      WHERE normalized_stage = 'CLOSED_WON'
        AND close_date BETWEEN @sd AND @ed
      GROUP BY sales_rep_name
    )
    SELECT
      f.sales_rep_name AS rep_name,
      f.mr_ytd,
      f.mr_last_month,
      f.tpv_ytd,
      COALESCE(d.deal_count, 0) AS deal_count
    FROM financials f
    LEFT JOIN deals d USING (sales_rep_name)
    WHERE f.sales_rep_name IS NOT NULL AND f.mr_ytd > 0
    ORDER BY f.mr_ytd DESC
  `;

  const params: Record<string, unknown> = {
    sd:   isoDate(startDate),
    ed:   isoDate(endDate),
    lcms: isoDate(lcmStart),
    lcme: isoDate(lcmEnd),
  };
  if (tier) params.tier = tier;

  const rows = await runQuery<{
    rep_name: string; mr_ytd: number; mr_last_month: number; tpv_ytd: number; deal_count: number;
  }>(sql, params);

  const maxMR = rows.length > 0 ? Number(rows[0].mr_ytd) : 1;

  return rows.map((r, i) => ({
    rank:        i + 1,
    repName:     r.rep_name,
    mrYTD:       Number(r.mr_ytd),
    mrLastMonth: Number(r.mr_last_month),
    mrYTDPct:    Number(r.mr_ytd) / maxMR,
    tpvYTD:      Number(r.tpv_ytd),
    dealCount:   Number(r.deal_count),
  }));
}

export interface ActivityLeaderboardRow {
  rank: number;
  repName: string;
  count: number;
}

type ActivityStage = 'explore' | 'propose' | 'trade' | 'handover';

const STAGE_DATE_FIELD: Record<ActivityStage, string> = {
  explore:  'first_explore_meeting_date',
  propose:  'date_set_to_propose',
  trade:    'date_set_to_trade',
  handover: 'date_set_to_handover',
};

export async function getActivityLeaderboard(
  stage: ActivityStage,
  filters: DashboardFilters,
): Promise<ActivityLeaderboardRow[]> {
  const field = STAGE_DATE_FIELD[stage];
  const repClause = filters.repName ? `AND LOWER(sales_rep_name) LIKE LOWER(@rep)` : '';

  const sql = `
    SELECT sales_rep_name AS rep_name, COUNT(*) AS cnt
    FROM ${tbl(BQ.opportunities)}
    WHERE ${field} BETWEEN @start AND @end
      AND is_noram = TRUE
      ${repClause}
    GROUP BY rep_name
    ORDER BY cnt DESC
    LIMIT 10
  `;

  const params: Record<string, unknown> = {
    start: isoDate(filters.startDate),
    end:   isoDate(filters.endDate),
  };
  if (filters.repName) params.rep = `%${filters.repName}%`;

  const rows = await runQuery<{ rep_name: string; cnt: number }>(sql, params);

  return rows
    .filter(r => r.rep_name)
    .map((r, i) => ({ rank: i + 1, repName: r.rep_name, count: Number(r.cnt) }));
}
