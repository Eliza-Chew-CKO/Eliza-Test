import { runQuery, tbl, BQ } from '../lib/bigquery';
import { DashboardFilters, lastCompletedMonthStart } from '../middleware/filters';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Backbook account-level performance ───────────────────────────────────────

export interface BackbookClientRow {
  alias: string;
  accountName: string | null;
  tier: string | null;
  rating: string | null;
  accountManager: string | null;
  salesRep: string | null;
  isManaged: boolean;
  qtdMR: number;
  mrYTD: number;
  mrLastMonth: number;
  mrYoYPct: number | null;
  tpvYTD: number;
  tpvLastMonth: number;
  pctToTarget: number | null;
}

async function fetchBackbookAccounts(
  filters: DashboardFilters,
  isManaged: boolean,
): Promise<BackbookClientRow[]> {
  const { startDate, endDate, tier, repName } = filters;
  const now      = new Date();
  const qMonth   = Math.floor(now.getUTCMonth() / 3) * 3;
  const qtdStart = isoDate(new Date(Date.UTC(now.getUTCFullYear(), qMonth, 1)));
  const lcmStart = lastCompletedMonthStart();
  const lcmEnd   = new Date(Date.UTC(lcmStart.getUTCFullYear(), lcmStart.getUTCMonth() + 1, 0));
  const yoyStart = isoDate(new Date(Date.UTC(startDate.getUTCFullYear() - 1, 0, 1)));
  const yoyEnd   = isoDate(new Date(Date.UTC(startDate.getUTCFullYear() - 1, endDate.getUTCMonth(), endDate.getUTCDate())));

  const tierClause = tier    ? `AND tier = @tier`                             : '';
  const repClause  = repName ? `AND LOWER(sales_rep_name) LIKE LOWER(@rep)` : '';

  const sql = `
    WITH base AS (
      SELECT
        alias,
        account_name,
        tier,
        rating,
        account_manager_name AS account_manager,
        sales_rep_name       AS sales_rep,
        total_fee_inc_gross_fx,
        tpv_amount,
        reporting_month
      FROM ${tbl(BQ.financials)}
      WHERE book_type = 'BACKBOOK'
        AND go_live_date < '2026-01-01'
        AND go_live_region = 'NORAM'
        AND NOT UPPER(IFNULL(referral_partner, '')) LIKE '%SOLIDGATE%'
        AND is_managed = @isManaged
        ${tierClause}
        ${repClause}
    )
    SELECT
      alias,
      ANY_VALUE(account_name)      AS account_name,
      ANY_VALUE(tier)              AS tier,
      ANY_VALUE(rating)            AS rating,
      ANY_VALUE(account_manager)   AS account_manager,
      ANY_VALUE(sales_rep)         AS sales_rep,
      COALESCE(SUM(IF(reporting_month BETWEEN @sd AND @ed, total_fee_inc_gross_fx, 0)), 0) AS mr_ytd,
      COALESCE(SUM(IF(reporting_month BETWEEN @qtds AND @ed, total_fee_inc_gross_fx, 0)), 0) AS qtd_mr,
      COALESCE(SUM(IF(reporting_month BETWEEN @lcms AND @lcme, total_fee_inc_gross_fx, 0)), 0) AS mr_last_month,
      COALESCE(SUM(IF(reporting_month BETWEEN @yoys AND @yoye, total_fee_inc_gross_fx, 0)), 0) AS mr_yoy,
      COALESCE(SUM(IF(reporting_month BETWEEN @sd AND @ed, tpv_amount, 0)), 0)              AS tpv_ytd,
      COALESCE(SUM(IF(reporting_month BETWEEN @lcms AND @lcme, tpv_amount, 0)), 0)          AS tpv_last_month
    FROM base
    GROUP BY alias
    HAVING mr_ytd > 0
    ORDER BY mr_ytd DESC
  `;

  const amTgtSql = `
    SELECT alias, CAST(revenue_target AS FLOAT64) AS revenue_target
    FROM ${tbl(BQ.amTargets)}
    QUALIFY ROW_NUMBER() OVER (PARTITION BY alias ORDER BY quarter DESC) = 1
  `;

  const params: Record<string, unknown> = {
    isManaged,
    sd:   isoDate(startDate),
    ed:   isoDate(endDate),
    qtds: qtdStart,
    lcms: isoDate(lcmStart),
    lcme: isoDate(lcmEnd),
    yoys: yoyStart,
    yoye: yoyEnd,
  };
  if (tier)    params.tier = tier;
  if (repName) params.rep  = `%${repName}%`;

  const [rows, amTargets] = await Promise.all([
    runQuery<{
      alias: string; account_name: string | null; tier: string | null;
      rating: string | null; account_manager: string | null; sales_rep: string | null;
      mr_ytd: number; qtd_mr: number; mr_last_month: number; mr_yoy: number;
      tpv_ytd: number; tpv_last_month: number;
    }>(sql, params),
    runQuery<{ alias: string; revenue_target: number }>(amTgtSql, {}),
  ]);

  const tgtMap = new Map(amTargets.map(t => [t.alias, Number(t.revenue_target)]));

  return rows.map(r => {
    const mrYTD   = Number(r.mr_ytd);
    const mrYoY   = Number(r.mr_yoy);
    const amTarget = tgtMap.get(r.alias) ?? null;
    return {
      alias:        r.alias,
      accountName:  r.account_name,
      tier:         r.tier,
      rating:       r.rating,
      accountManager: r.account_manager,
      salesRep:     r.sales_rep,
      isManaged,
      qtdMR:        Number(r.qtd_mr),
      mrYTD,
      mrLastMonth:  Number(r.mr_last_month),
      mrYoYPct:     mrYoY > 0 ? mrYTD / mrYoY - 1 : null,
      tpvYTD:       Number(r.tpv_ytd),
      tpvLastMonth: Number(r.tpv_last_month),
      pctToTarget:  amTarget ? mrYTD / amTarget - 1 : null,
    };
  });
}

export const getManagedAccounts   = (f: DashboardFilters) => fetchBackbookAccounts(f, true);
export const getUnmanagedAccounts = (f: DashboardFilters) => fetchBackbookAccounts(f, false);

// ─── Excessive VAMP ───────────────────────────────────────────────────────────

export interface ExcessiveVampRow {
  alias: string;
  owner: string | null;
  domain: string | null;
  vampAssessment: number;
  vampRatio: number;
  createdEvents: number;
  fraudEvents: number;
}

export async function getExcessiveVamp(_filters: DashboardFilters): Promise<ExcessiveVampRow[]> {
  const sql = `
    SELECT
      alias,
      sales_rep_name        AS owner,
      website_domain        AS domain,
      vamp_ratio,
      created_events,
      fraud_events,
      (created_events + fraud_events) * 8 AS vamp_assessment
    FROM ${tbl(BQ.vamp)}
    WHERE is_excessive_flag = TRUE
       OR (vamp_ratio > 0.015 AND fraud_events > 1500)
    ORDER BY vamp_assessment DESC
  `;

  const rows = await runQuery<{
    alias: string; owner: string | null; domain: string | null;
    vamp_ratio: number; created_events: number; fraud_events: number; vamp_assessment: number;
  }>(sql, {});

  return rows.map(r => ({
    alias:          r.alias,
    owner:          r.owner,
    domain:         r.domain,
    vampRatio:      Number(r.vamp_ratio),
    createdEvents:  Number(r.created_events),
    fraudEvents:    Number(r.fraud_events),
    vampAssessment: Number(r.vamp_assessment),
  }));
}

// ─── VAMP monthly trend ───────────────────────────────────────────────────────

export interface VampTrendPoint {
  month: string;
  isoMonth: string;
  avgRatio: number;
  flaggedCount: number;
}

export async function getVampTrend(filters: DashboardFilters): Promise<VampTrendPoint[]> {
  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m', reporting_month) AS iso_month,
      AVG(vamp_ratio)                        AS avg_ratio,
      COUNTIF(is_excessive_flag = TRUE OR (vamp_ratio > 0.015 AND fraud_events > 1500)) AS flagged_count
    FROM ${tbl(BQ.vamp)}
    WHERE reporting_month BETWEEN @start AND @end
      AND is_excessive_flag = FALSE
    GROUP BY iso_month
    ORDER BY iso_month
  `;

  const rows = await runQuery<{ iso_month: string; avg_ratio: number; flagged_count: number }>(sql, {
    start: isoDate(filters.startDate),
    end:   isoDate(filters.endDate),
  });

  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return rows.map(r => {
    const m = parseInt(r.iso_month.split('-')[1]) - 1;
    return {
      month:        `${MONTH_LABELS[m]} ${r.iso_month.split('-')[0].slice(2)}`,
      isoMonth:     r.iso_month,
      avgRatio:     Number(r.avg_ratio),
      flaggedCount: Number(r.flagged_count),
    };
  });
}
