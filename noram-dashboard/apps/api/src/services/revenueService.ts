import { runQuery, tbl, BQ } from '../lib/bigquery';
import { DashboardFilters, lastCompletedMonthStart, subMonths } from '../middleware/filters';

// ─── KPI Summary ──────────────────────────────────────────────────────────────

export interface KPIMetric {
  value: number;
  target: number | null;
  variancePct: number | null;
  varianceAbs: number | null;
  runRate: number | null;
  runRateMoMPct: number | null;
  yoyPct: number | null;
}

export interface KPISummary {
  frontbookNR: KPIMetric;
  backbookNR: KPIMetric;
  totalMR: KPIMetric;
  usBinTPV: KPIMetric;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function kpiMetric(
  value: number,
  target: number | null,
  lcm: number,
  prevLcm: number,
  yoy: number,
): KPIMetric {
  return {
    value,
    target,
    variancePct: target ? value / target - 1 : null,
    varianceAbs: target ? value - target : null,
    runRate: lcm * 12,
    runRateMoMPct: prevLcm > 0 ? lcm / prevLcm - 1 : null,
    yoyPct: yoy > 0 ? value / yoy - 1 : null,
  };
}

export async function getKPISummary(filters: DashboardFilters): Promise<KPISummary> {
  const { startDate, endDate, tier, repName } = filters;
  const lcmStart  = lastCompletedMonthStart();
  const lcmEnd    = new Date(Date.UTC(lcmStart.getUTCFullYear(), lcmStart.getUTCMonth() + 1, 0));
  const prevStart = subMonths(lcmStart, 1);
  const prevEnd   = new Date(Date.UTC(lcmStart.getUTCFullYear(), lcmStart.getUTCMonth(), 0));
  const yoyStart  = new Date(Date.UTC(startDate.getUTCFullYear() - 1, startDate.getUTCMonth(), 1));
  const yoyEnd    = new Date(Date.UTC(endDate.getUTCFullYear() - 1, endDate.getUTCMonth(), endDate.getUTCDate()));

  const tierClause = tier ? `AND tier = @tier` : '';
  const repClause  = repName ? `AND LOWER(sales_rep_name) LIKE LOWER(@repName)` : '';
  const baseWhere = `
    go_live_region = 'NORAM'
    AND NOT UPPER(IFNULL(referral_partner, '')) LIKE '%SOLIDGATE%'
    ${tierClause}
    ${repClause}
  `;

  const sql = `
    WITH
    fb_ytd AS (
      SELECT COALESCE(SUM(total_fee_inc_gross_fx), 0) AS v
      FROM ${tbl(BQ.financials)}
      WHERE book_type = 'FRONTBOOK'
        AND reporting_month BETWEEN @sd AND @ed
        ${baseWhere}
    ),
    fb_lcm AS (
      SELECT COALESCE(SUM(total_fee_inc_gross_fx), 0) AS v
      FROM ${tbl(BQ.financials)}
      WHERE book_type = 'FRONTBOOK'
        AND reporting_month BETWEEN @lcms AND @lcme
        ${baseWhere}
    ),
    fb_prev AS (
      SELECT COALESCE(SUM(total_fee_inc_gross_fx), 0) AS v
      FROM ${tbl(BQ.financials)}
      WHERE book_type = 'FRONTBOOK'
        AND reporting_month BETWEEN @prevs AND @preve
        ${baseWhere}
    ),
    fb_yoy AS (
      SELECT COALESCE(SUM(total_fee_inc_gross_fx), 0) AS v
      FROM ${tbl(BQ.financials)}
      WHERE book_type = 'FRONTBOOK'
        AND reporting_month BETWEEN @yoys AND @yoye
        ${baseWhere}
    ),
    bb_ytd AS (
      SELECT COALESCE(SUM(total_fee_inc_gross_fx), 0) AS v
      FROM ${tbl(BQ.financials)}
      WHERE book_type = 'BACKBOOK'
        AND reporting_month BETWEEN @sd AND @ed
        AND go_live_date < '2026-01-01'
        ${baseWhere}
    ),
    bb_lcm AS (
      SELECT COALESCE(SUM(total_fee_inc_gross_fx), 0) AS v
      FROM ${tbl(BQ.financials)}
      WHERE book_type = 'BACKBOOK'
        AND reporting_month BETWEEN @lcms AND @lcme
        AND go_live_date < '2026-01-01'
        ${baseWhere}
    ),
    bb_prev AS (
      SELECT COALESCE(SUM(total_fee_inc_gross_fx), 0) AS v
      FROM ${tbl(BQ.financials)}
      WHERE book_type = 'BACKBOOK'
        AND reporting_month BETWEEN @prevs AND @preve
        AND go_live_date < '2026-01-01'
        ${baseWhere}
    ),
    bb_yoy AS (
      SELECT COALESCE(SUM(total_fee_inc_gross_fx), 0) AS v
      FROM ${tbl(BQ.financials)}
      WHERE book_type = 'BACKBOOK'
        AND reporting_month BETWEEN @yoys AND @yoye
        AND go_live_date < '2026-01-01'
        ${baseWhere}
    ),
    tpv_ytd AS (
      SELECT COALESCE(SUM(payment_volume), 0) AS v
      FROM ${tbl(BQ.tpv)}
      WHERE report_date BETWEEN @sd AND @ed
        AND global_acquirer_id IN ('crb', 'pw')
    ),
    tpv_lcm AS (
      SELECT COALESCE(SUM(payment_volume), 0) AS v
      FROM ${tbl(BQ.tpv)}
      WHERE report_date BETWEEN @lcms AND @lcme
        AND global_acquirer_id IN ('crb', 'pw')
    ),
    tpv_prev AS (
      SELECT COALESCE(SUM(payment_volume), 0) AS v
      FROM ${tbl(BQ.tpv)}
      WHERE report_date BETWEEN @prevs AND @preve
        AND global_acquirer_id IN ('crb', 'pw')
    ),
    tpv_yoy AS (
      SELECT COALESCE(SUM(payment_volume), 0) AS v
      FROM ${tbl(BQ.tpv)}
      WHERE report_date BETWEEN @yoys AND @yoye
        AND global_acquirer_id IN ('crb', 'pw')
    ),
    fb_tgt AS (
      SELECT CAST(amount AS FLOAT64) * 1000 AS v
      FROM ${tbl(BQ.targets)}
      WHERE type = 'FRONTBOOK_NR_CUMUL' AND period <= @ed
      ORDER BY period DESC LIMIT 1
    ),
    bb_tgt AS (
      SELECT CAST(amount AS FLOAT64) * 1000000 AS v
      FROM ${tbl(BQ.targets)}
      WHERE type = 'BACKBOOK_NR' AND period <= @ed
      ORDER BY period DESC LIMIT 1
    ),
    tpv_tgt AS (
      SELECT CAST(amount AS FLOAT64) * 1000000000 AS v
      FROM ${tbl(BQ.targets)}
      WHERE type = 'TPV_ANNUALISED' AND period <= @ed
      ORDER BY period DESC LIMIT 1
    )
    SELECT
      (SELECT v FROM fb_ytd)  AS fb_ytd,
      (SELECT v FROM fb_lcm)  AS fb_lcm,
      (SELECT v FROM fb_prev) AS fb_prev,
      (SELECT v FROM fb_yoy)  AS fb_yoy,
      (SELECT v FROM bb_ytd)  AS bb_ytd,
      (SELECT v FROM bb_lcm)  AS bb_lcm,
      (SELECT v FROM bb_prev) AS bb_prev,
      (SELECT v FROM bb_yoy)  AS bb_yoy,
      (SELECT v FROM tpv_ytd) AS tpv_ytd,
      (SELECT v FROM tpv_lcm) AS tpv_lcm,
      (SELECT v FROM tpv_prev)AS tpv_prev,
      (SELECT v FROM tpv_yoy) AS tpv_yoy,
      (SELECT v FROM fb_tgt)  AS fb_tgt,
      (SELECT v FROM bb_tgt)  AS bb_tgt,
      (SELECT v FROM tpv_tgt) AS tpv_tgt
  `;

  const params: Record<string, unknown> = {
    sd:    isoDate(startDate),
    ed:    isoDate(endDate),
    lcms:  isoDate(lcmStart),
    lcme:  isoDate(lcmEnd),
    prevs: isoDate(prevStart),
    preve: isoDate(prevEnd),
    yoys:  isoDate(yoyStart),
    yoye:  isoDate(yoyEnd),
  };
  if (tier)    params.tier    = tier;
  if (repName) params.repName = `%${repName}%`;

  const [row] = await runQuery<Record<string, number | null>>(sql, params);

  const fbYTD  = Number(row.fb_ytd  ?? 0);
  const fbLCM  = Number(row.fb_lcm  ?? 0);
  const fbPrev = Number(row.fb_prev ?? 0);
  const fbYoY  = Number(row.fb_yoy  ?? 0);
  const fbTgt  = row.fb_tgt != null ? Number(row.fb_tgt) : null;

  const bbYTD  = Number(row.bb_ytd  ?? 0);
  const bbLCM  = Number(row.bb_lcm  ?? 0);
  const bbPrev = Number(row.bb_prev ?? 0);
  const bbYoY  = Number(row.bb_yoy  ?? 0);
  const bbTgt  = row.bb_tgt != null ? Number(row.bb_tgt) : null;

  const tpvYTD  = Number(row.tpv_ytd  ?? 0);
  const tpvLCM  = Number(row.tpv_lcm  ?? 0);
  const tpvPrev = Number(row.tpv_prev ?? 0);
  const tpvYoY  = Number(row.tpv_yoy  ?? 0);
  const tpvTgt  = row.tpv_tgt != null ? Number(row.tpv_tgt) : null;

  const frontbookNR = kpiMetric(fbYTD, fbTgt, fbLCM, fbPrev, fbYoY);
  const backbookNR  = kpiMetric(bbYTD, bbTgt, bbLCM, bbPrev, bbYoY);
  const usBinTPV    = kpiMetric(tpvYTD, tpvTgt, tpvLCM, tpvPrev, tpvYoY);
  const totalMR     = kpiMetric(
    fbYTD + bbYTD,
    fbTgt && bbTgt ? fbTgt + bbTgt : null,
    fbLCM + bbLCM,
    fbPrev + bbPrev,
    fbYoY + bbYoY,
  );

  return { frontbookNR, backbookNR, totalMR, usBinTPV };
}

// ─── Monthly trend series ─────────────────────────────────────────────────────

export interface MonthlyPoint {
  month: string;
  isoMonth: string;
  actual: number;
  cumulActual: number;
  baseTarget: number | null;
  rollTarget: number | null;
  cumulBase: number | null;
  cumulRoll: number | null;
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export async function getFrontbookTrend(filters: DashboardFilters): Promise<MonthlyPoint[]> {
  const year     = filters.startDate.getUTCFullYear();
  const janStart = isoDate(new Date(Date.UTC(year, 0, 1)));
  const endCap   = isoDate(filters.endDate);

  const tierClause = filters.tier ? `AND tier = @tier` : '';
  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m', reporting_month) AS iso_month,
      SUM(total_fee_inc_gross_fx) AS actual
    FROM ${tbl(BQ.financials)}
    WHERE book_type = 'FRONTBOOK'
      AND reporting_month BETWEEN @start AND @end
      AND go_live_region = 'NORAM'
      AND NOT UPPER(IFNULL(referral_partner, '')) LIKE '%SOLIDGATE%'
      ${tierClause}
    GROUP BY iso_month
    ORDER BY iso_month
  `;

  const tgtSql = `
    SELECT
      FORMAT_DATE('%Y-%m', period) AS iso_month,
      type,
      CAST(amount AS FLOAT64) AS amount
    FROM ${tbl(BQ.targets)}
    WHERE type IN ('FRONTBOOK_NR', 'FRONTBOOK_NR_CUMUL')
      AND period BETWEEN @start AND @yearEnd
    ORDER BY period
  `;

  const params: Record<string, unknown> = {
    start:   janStart,
    end:     endCap,
    yearEnd: `${year}-12-31`,
  };
  if (filters.tier) params.tier = filters.tier;

  const [actuals, targets] = await Promise.all([
    runQuery<{ iso_month: string; actual: number }>(sql, params),
    runQuery<{ iso_month: string; type: string; amount: number }>(tgtSql, {
      start: janStart, yearEnd: `${year}-12-31`,
    }),
  ]);

  const actualMap = new Map(actuals.map(r => [r.iso_month, Number(r.actual)]));
  const baseMap   = new Map(targets.filter(t => t.type === 'FRONTBOOK_NR').map(t => [t.iso_month, Number(t.amount) * 1000]));
  const rollMap   = new Map(targets.filter(t => t.type === 'FRONTBOOK_NR_CUMUL').map(t => [t.iso_month, Number(t.amount) * 1000]));

  const points: MonthlyPoint[] = [];
  let cumul = 0;
  for (let m = 0; m < 12; m++) {
    const key = `${year}-${String(m + 1).padStart(2, '0')}`;
    const a   = actualMap.get(key) ?? 0;
    cumul += a;
    points.push({
      month:       `${MONTH_LABELS[m]} ${String(year).slice(2)}`,
      isoMonth:    key,
      actual:      a,
      cumulActual: cumul,
      baseTarget:  baseMap.get(key) ?? null,
      rollTarget:  null,
      cumulBase:   null,
      cumulRoll:   rollMap.get(key) ?? null,
    });
  }
  return points;
}

export async function getBackbookTrend(filters: DashboardFilters): Promise<MonthlyPoint[]> {
  const year     = filters.startDate.getUTCFullYear();
  const janStart = isoDate(new Date(Date.UTC(year, 0, 1)));
  const endCap   = isoDate(filters.endDate);

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m', reporting_month) AS iso_month,
      SUM(total_fee_inc_gross_fx) AS actual
    FROM ${tbl(BQ.financials)}
    WHERE book_type = 'BACKBOOK'
      AND reporting_month BETWEEN @start AND @end
      AND go_live_date < '2026-01-01'
      AND go_live_region = 'NORAM'
      AND NOT UPPER(IFNULL(referral_partner, '')) LIKE '%SOLIDGATE%'
    GROUP BY iso_month
    ORDER BY iso_month
  `;

  const tgtSql = `
    SELECT FORMAT_DATE('%Y-%m', period) AS iso_month, CAST(amount AS FLOAT64) AS amount
    FROM ${tbl(BQ.targets)}
    WHERE type = 'BACKBOOK_NR' AND period BETWEEN @start AND @yearEnd
    ORDER BY period
  `;

  const [actuals, targets] = await Promise.all([
    runQuery<{ iso_month: string; actual: number }>(sql, { start: janStart, end: endCap }),
    runQuery<{ iso_month: string; amount: number }>(tgtSql, { start: janStart, yearEnd: `${year}-12-31` }),
  ]);

  const actualMap = new Map(actuals.map(r => [r.iso_month, Number(r.actual)]));
  const tgtMap    = new Map(targets.map(t => [t.iso_month, Number(t.amount) * 1_000_000]));

  const points: MonthlyPoint[] = [];
  let cumul = 0;
  for (let m = 0; m < 12; m++) {
    const key = `${year}-${String(m + 1).padStart(2, '0')}`;
    const a   = actualMap.get(key) ?? 0;
    cumul += a;
    points.push({
      month: `${MONTH_LABELS[m]} ${String(year).slice(2)}`,
      isoMonth: key,
      actual: a,
      cumulActual: cumul,
      baseTarget: tgtMap.get(key) ?? null,
      rollTarget: null,
      cumulBase: null,
      cumulRoll: null,
    });
  }
  return points;
}

export async function getTPVByMonth(
  filters: DashboardFilters,
): Promise<{ month: string; isoMonth: string; volume: number }[]> {
  const year     = filters.startDate.getUTCFullYear();
  const janStart = isoDate(new Date(Date.UTC(year, 0, 1)));
  const endCap   = isoDate(filters.endDate);

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m', report_date) AS iso_month,
      SUM(payment_volume) AS volume
    FROM ${tbl(BQ.tpv)}
    WHERE report_date BETWEEN @start AND @end
      AND global_acquirer_id IN ('crb', 'pw')
    GROUP BY iso_month
    ORDER BY iso_month
  `;

  const rows = await runQuery<{ iso_month: string; volume: number }>(sql, {
    start: janStart, end: endCap,
  });

  return rows.map(r => {
    const m = parseInt(r.iso_month.split('-')[1]) - 1;
    return {
      month:    `${MONTH_LABELS[m]} ${r.iso_month.split('-')[0].slice(2)}`,
      isoMonth: r.iso_month,
      volume:   Number(r.volume),
    };
  });
}
