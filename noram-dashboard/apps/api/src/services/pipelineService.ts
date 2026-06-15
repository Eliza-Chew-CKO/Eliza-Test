import { runQuery, tbl, BQ } from '../lib/bigquery';
import { DashboardFilters } from '../middleware/filters';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Weighted Pipeline Over Time ──────────────────────────────────────────────

export interface WeightedPipelinePoint {
  month: string;
  isoMonth: string;
  Explore: number;
  Propose: number;
  Trade: number;
  Handover: number;
  Live: number;
  total: number;
}

const EXCLUDED_STAGES = [
  'disqualified', 'terminated merchant', 'qa required',
  'closed/won', 'closed/lost', 'closed lost', 'merchant lost',
];

function normalizeStageLabel(raw: string): string {
  const s = raw.toLowerCase();
  if (s.startsWith('explore') || s.startsWith('e1') || s.startsWith('e2')) return 'Explore';
  if (s.startsWith('propose') || s.startsWith('p1') || s.startsWith('p2')) return 'Propose';
  if (s.startsWith('trade')   || s.startsWith('t1') || s.startsWith('t2')) return 'Trade';
  if (s.startsWith('handover')|| s.startsWith('h1') || s.startsWith('h2')) return 'Handover';
  if (s.startsWith('live')    || s.startsWith('l1'))                        return 'Live';
  return 'Other';
}

export async function getWeightedPipeline(filters: DashboardFilters): Promise<WeightedPipelinePoint[]> {
  const repClause = filters.repName
    ? `AND LOWER(sales_rep_name) LIKE LOWER(@repName)` : '';

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m', snapshot_date) AS iso_month,
      stage_name,
      SUM(weighted_expected_mnr) AS total_mnr
    FROM ${tbl(BQ.pipelineSnapshots)}
    WHERE snapshot_date BETWEEN @start AND @end
      AND NOT LOWER(stage_name) IN UNNEST(@excluded)
      AND NOT UPPER(account_name) LIKE '%GOLIATH CAPITAL%'
      ${repClause}
    GROUP BY iso_month, stage_name
    ORDER BY iso_month
  `;

  const params: Record<string, unknown> = {
    start:    isoDate(filters.startDate),
    end:      isoDate(filters.endDate),
    excluded: EXCLUDED_STAGES,
  };
  if (filters.repName) params.repName = `%${filters.repName}%`;

  const rows = await runQuery<{ iso_month: string; stage_name: string; total_mnr: number }>(sql, params);

  const monthMap = new Map<string, Record<string, number>>();
  for (const row of rows) {
    if (!monthMap.has(row.iso_month)) {
      monthMap.set(row.iso_month, { Explore: 0, Propose: 0, Trade: 0, Handover: 0, Live: 0 });
    }
    const bucket = monthMap.get(row.iso_month)!;
    const stage  = normalizeStageLabel(row.stage_name);
    if (stage !== 'Other') bucket[stage] = (bucket[stage] ?? 0) + Number(row.total_mnr);
  }

  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([isoMonth, stages]) => {
      const m = parseInt(isoMonth.split('-')[1]) - 1;
      const y = isoMonth.split('-')[0];
      return {
        month:    `${MONTH_LABELS[m]} ${y.slice(2)}`,
        isoMonth,
        Explore:  stages.Explore,
        Propose:  stages.Propose,
        Trade:    stages.Trade,
        Handover: stages.Handover,
        Live:     stages.Live,
        total:    stages.Explore + stages.Propose + stages.Trade + stages.Handover + stages.Live,
      };
    });
}

// ─── Pipeline Bottlenecks (L90 vs Prior 90) ───────────────────────────────────

export interface BottleneckMetric {
  label: string;
  last90: number;
  prior90: number;
  changePct: number | null;
}

export async function getPipelineBottlenecks(filters: DashboardFilters): Promise<BottleneckMetric[]> {
  const now         = new Date();
  const l90Start    = isoDate(new Date(now.getTime() - 90  * 86400_000));
  const prior90Start= isoDate(new Date(now.getTime() - 180 * 86400_000));
  const prior90End  = isoDate(new Date(now.getTime() - 91  * 86400_000));
  const nowStr      = isoDate(now);

  const repClause = filters.repName ? `AND LOWER(sales_rep_name) LIKE LOWER(@repName)` : '';
  const UW_APPROVED = ['COMPLETED','APPROVED BY CKO','WAITING FOR CREDENTIALS','CREDENTIALS RELEASED'];

  const sql = `
    SELECT
      -- Explore meetings
      COUNTIF(first_explore_meeting_date BETWEEN @l90s AND @now ${repClause.replace(/AND/g,'AND')}) AS explore_l90,
      COUNTIF(first_explore_meeting_date BETWEEN @p90s AND @p90e ${repClause.replace(/AND/g,'AND')}) AS explore_p90,
      -- Moved to Propose
      COUNTIF(date_set_to_propose BETWEEN @l90s AND @now ${repClause.replace(/AND/g,'AND')}) AS propose_l90,
      COUNTIF(date_set_to_propose BETWEEN @p90s AND @p90e ${repClause.replace(/AND/g,'AND')}) AS propose_p90,
      -- Moved to Trade
      COUNTIF(date_set_to_trade BETWEEN @l90s AND @now ${repClause.replace(/AND/g,'AND')}) AS trade_l90,
      COUNTIF(date_set_to_trade BETWEEN @p90s AND @p90e ${repClause.replace(/AND/g,'AND')}) AS trade_p90,
      -- Moved to Handover
      COUNTIF(date_set_to_handover BETWEEN @l90s AND @now ${repClause.replace(/AND/g,'AND')}) AS handover_l90,
      COUNTIF(date_set_to_handover BETWEEN @p90s AND @p90e ${repClause.replace(/AND/g,'AND')}) AS handover_p90,
      -- MAF Submitted
      COUNTIF(date_maf_submitted BETWEEN @l90s AND @now ${repClause.replace(/AND/g,'AND')}) AS maf_l90,
      COUNTIF(date_maf_submitted BETWEEN @p90s AND @p90e ${repClause.replace(/AND/g,'AND')}) AS maf_p90,
      -- Underwriting approved
      COUNTIF(date_underwriting_done BETWEEN @l90s AND @now
        AND UPPER(underwriting_new_value) IN UNNEST(@uw_approved)
        ${repClause.replace(/AND/g,'AND')}) AS uw_l90,
      COUNTIF(date_underwriting_done BETWEEN @p90s AND @p90e
        AND UPPER(underwriting_new_value) IN UNNEST(@uw_approved)
        ${repClause.replace(/AND/g,'AND')}) AS uw_p90
    FROM ${tbl(BQ.opportunities)}
    WHERE is_noram = TRUE
  `;

  const params: Record<string, unknown> = {
    l90s:        l90Start,
    now:         nowStr,
    p90s:        prior90Start,
    p90e:        prior90End,
    uw_approved: UW_APPROVED,
  };
  if (filters.repName) params.repName = `%${filters.repName}%`;

  const [row] = await runQuery<Record<string, number>>(sql, params);

  const pct = (l: number, p: number) => p > 0 ? l / p - 1 : null;

  return [
    { label: 'Explore Meetings',      last90: row.explore_l90,  prior90: row.explore_p90,  changePct: pct(row.explore_l90,  row.explore_p90) },
    { label: 'Moved to Propose',      last90: row.propose_l90,  prior90: row.propose_p90,  changePct: pct(row.propose_l90,  row.propose_p90) },
    { label: 'Moved to Trade',        last90: row.trade_l90,    prior90: row.trade_p90,    changePct: pct(row.trade_l90,    row.trade_p90) },
    { label: 'Moved to Handover',     last90: row.handover_l90, prior90: row.handover_p90, changePct: pct(row.handover_l90, row.handover_p90) },
    { label: 'MAF Submitted',         last90: row.maf_l90,      prior90: row.maf_p90,      changePct: pct(row.maf_l90,      row.maf_p90) },
    { label: 'Underwriting Approved', last90: row.uw_l90,       prior90: row.uw_p90,       changePct: pct(row.uw_l90,       row.uw_p90) },
  ];
}

// ─── Go-Live Tracker ──────────────────────────────────────────────────────────

export interface GoLiveTracker {
  count: number;
  goldCount: number;
  target: number | null;
  goldTarget: number | null;
  pctToTarget: number | null;
}

export async function getGoLiveTracker(filters: DashboardFilters): Promise<GoLiveTracker> {
  const sql = `
    SELECT
      COUNT(*) AS total,
      COUNTIF(LOWER(rating) = 'gold') AS gold
    FROM ${tbl(BQ.financials)}
    WHERE normalized_stage = 'CLOSED_WON'
      AND close_date BETWEEN @start AND @end
      AND go_live_region = 'NORAM'
  `;

  const tgtSql = `
    SELECT type, CAST(amount AS FLOAT64) AS amount
    FROM ${tbl(BQ.targets)}
    WHERE type IN ('GO_LIVE_TOTAL', 'GO_LIVE_GOLD') AND period <= @end
    QUALIFY ROW_NUMBER() OVER (PARTITION BY type ORDER BY period DESC) = 1
  `;

  const params = { start: isoDate(filters.startDate), end: isoDate(filters.endDate) };
  const [counts, targets] = await Promise.all([
    runQuery<{ total: number; gold: number }>(sql, params),
    runQuery<{ type: string; amount: number }>(tgtSql, { end: isoDate(filters.endDate) }),
  ]);

  const count     = Number(counts[0]?.total ?? 0);
  const goldCount = Number(counts[0]?.gold ?? 0);
  const tgt       = targets.find(t => t.type === 'GO_LIVE_TOTAL');
  const goldTgt   = targets.find(t => t.type === 'GO_LIVE_GOLD');
  const tgtVal    = tgt ? Number(tgt.amount) : null;

  return {
    count,
    goldCount,
    target:      tgtVal,
    goldTarget:  goldTgt ? Number(goldTgt.amount) : null,
    pctToTarget: tgtVal ? count / tgtVal - 1 : null,
  };
}
