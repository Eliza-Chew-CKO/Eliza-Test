import { Prisma, prisma } from '../lib/prisma';
import { DashboardFilters, monthStart, subMonths, lastCompletedMonthStart } from '../middleware/filters';

const SOLIDGATE_FILTER = { NOT: { referralPartner: { contains: 'SOLIDGATE', mode: Prisma.QueryMode.insensitive } } };

// ─── Shared account where clause ──────────────────────────────────────────────

function accountWhere(tier?: string) {
  return {
    ...SOLIDGATE_FILTER,
    ...(tier ? { tier: tier as any } : {}),
  };
}

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

export async function getKPISummary(filters: DashboardFilters): Promise<KPISummary> {
  const { startDate, endDate, tier, repName } = filters;
  const now = new Date();
  const currentYear = now.getUTCFullYear();

  // Same period last year for YoY
  const yoyStart = new Date(Date.UTC(startDate.getUTCFullYear() - 1, startDate.getUTCMonth(), 1));
  const yoyEnd   = new Date(Date.UTC(endDate.getUTCFullYear() - 1, endDate.getUTCMonth(), endDate.getUTCDate()));

  // Last completed month for run rate
  const lcmStart = lastCompletedMonthStart();
  const lcmEnd   = new Date(Date.UTC(lcmStart.getUTCFullYear(), lcmStart.getUTCMonth() + 1, 0)); // end of that month
  const prevMonthStart = subMonths(lcmStart, 1);
  const prevMonthEnd   = new Date(Date.UTC(lcmStart.getUTCFullYear(), lcmStart.getUTCMonth(), 0));

  const baseFinancialWhere = (bookType: 'FRONTBOOK' | 'BACKBOOK', dateFrom: Date, dateTo: Date) => ({
    bookType,
    reportingMonth: { gte: dateFrom, lte: dateTo },
    account: {
      ...accountWhere(tier),
      ...(repName ? { salesRep: { fullName: { contains: repName, mode: Prisma.QueryMode.insensitive } } } : {}),
    },
  });

  // ── Frontbook ────────────────────────────────────────────────────────────────
  const [fbYTD, fbYoY, fbLCM, fbPrevLCM] = await Promise.all([
    prisma.financialActual.aggregate({ where: baseFinancialWhere('FRONTBOOK', startDate, endDate), _sum: { totalFeeIncGrossFX: true } }),
    prisma.financialActual.aggregate({ where: baseFinancialWhere('FRONTBOOK', yoyStart, yoyEnd), _sum: { totalFeeIncGrossFX: true } }),
    prisma.financialActual.aggregate({ where: baseFinancialWhere('FRONTBOOK', lcmStart, lcmEnd), _sum: { totalFeeIncGrossFX: true } }),
    prisma.financialActual.aggregate({ where: baseFinancialWhere('FRONTBOOK', prevMonthStart, prevMonthEnd), _sum: { totalFeeIncGrossFX: true } }),
  ]);

  // Frontbook NR target: latest cumulative FRONTBOOK_NR_CUMUL at or before endDate
  const fbTarget = await prisma.target.findFirst({
    where: { type: 'FRONTBOOK_NR_CUMUL', period: { lte: endDate } },
    orderBy: { period: 'desc' },
  });

  const fbValue   = Number(fbYTD._sum.totalFeeIncGrossFX ?? 0);
  const fbTgt     = fbTarget ? Number(fbTarget.amount) * 1000 : null; // targets stored in $K
  const fbYoYVal  = Number(fbYoY._sum.totalFeeIncGrossFX ?? 0);
  const fbLCMVal  = Number(fbLCM._sum.totalFeeIncGrossFX ?? 0);
  const fbPrevVal = Number(fbPrevLCM._sum.totalFeeIncGrossFX ?? 0);

  const frontbookNR: KPIMetric = {
    value: fbValue,
    target: fbTgt,
    variancePct: fbTgt ? fbValue / fbTgt - 1 : null,
    varianceAbs: fbTgt ? fbValue - fbTgt : null,
    runRate: fbLCMVal * 12,
    runRateMoMPct: fbPrevVal > 0 ? fbLCMVal / fbPrevVal - 1 : null,
    yoyPct: fbYoYVal > 0 ? fbValue / fbYoYVal - 1 : null,
  };

  // ── Backbook ─────────────────────────────────────────────────────────────────
  // PRD: go-live date < 2026-01-01 for backbook
  const bbWhere = (dateFrom: Date, dateTo: Date) => ({
    ...baseFinancialWhere('BACKBOOK', dateFrom, dateTo),
    account: {
      ...accountWhere(tier),
      goLiveDate: { lt: new Date('2026-01-01') },
      ...(repName ? { salesRep: { fullName: { contains: repName, mode: Prisma.QueryMode.insensitive } } } : {}),
    },
  });

  const [bbYTD, bbYoY, bbLCM, bbPrevLCM] = await Promise.all([
    prisma.financialActual.aggregate({ where: bbWhere(startDate, endDate), _sum: { totalFeeIncGrossFX: true } }),
    prisma.financialActual.aggregate({ where: bbWhere(yoyStart, yoyEnd), _sum: { totalFeeIncGrossFX: true } }),
    prisma.financialActual.aggregate({ where: bbWhere(lcmStart, lcmEnd), _sum: { totalFeeIncGrossFX: true } }),
    prisma.financialActual.aggregate({ where: bbWhere(prevMonthStart, prevMonthEnd), _sum: { totalFeeIncGrossFX: true } }),
  ]);

  const bbTarget = await prisma.target.findFirst({
    where: { type: 'BACKBOOK_NR', period: { lte: endDate } },
    orderBy: { period: 'desc' },
  });

  const bbValue   = Number(bbYTD._sum.totalFeeIncGrossFX ?? 0);
  const bbTgt     = bbTarget ? Number(bbTarget.amount) * 1_000_000 : null; // targets stored in $M
  const bbYoYVal  = Number(bbYoY._sum.totalFeeIncGrossFX ?? 0);
  const bbLCMVal  = Number(bbLCM._sum.totalFeeIncGrossFX ?? 0);
  const bbPrevVal = Number(bbPrevLCM._sum.totalFeeIncGrossFX ?? 0);

  const backbookNR: KPIMetric = {
    value: bbValue,
    target: bbTgt,
    variancePct: bbTgt ? bbValue / bbTgt - 1 : null,
    varianceAbs: bbTgt ? bbValue - bbTgt : null,
    runRate: bbLCMVal * 12,
    runRateMoMPct: bbPrevVal > 0 ? bbLCMVal / bbPrevVal - 1 : null,
    yoyPct: bbYoYVal > 0 ? bbValue / bbYoYVal - 1 : null,
  };

  // ── US BIN TPV ────────────────────────────────────────────────────────────────
  // PRD: acquirer ID = crb, pw — stored in salesRepName field is not acquirer;
  // TpvActual doesn't carry acquirerId, so we aggregate all rows (the source
  // sheet "2. TPV - US Bin" is already filtered to US BIN by Looker).
  const [tpvYTD, tpvYoY, tpvLCM, tpvPrevLCM] = await Promise.all([
    prisma.tpvActual.aggregate({ where: { reportDate: { gte: startDate, lte: endDate } }, _sum: { paymentVolume: true } }),
    prisma.tpvActual.aggregate({ where: { reportDate: { gte: yoyStart, lte: yoyEnd } }, _sum: { paymentVolume: true } }),
    prisma.tpvActual.aggregate({ where: { reportDate: { gte: lcmStart, lte: lcmEnd } }, _sum: { paymentVolume: true } }),
    prisma.tpvActual.aggregate({ where: { reportDate: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { paymentVolume: true } }),
  ]);

  const tpvTarget = await prisma.target.findFirst({
    where: { type: 'TPV_ANNUALISED', period: { lte: endDate } },
    orderBy: { period: 'desc' },
  });

  const tpvValue   = Number(tpvYTD._sum.paymentVolume ?? 0);
  const tpvTgt     = tpvTarget ? Number(tpvTarget.amount) * 1_000_000_000 : null; // targets in $B
  const tpvYoYVal  = Number(tpvYoY._sum.paymentVolume ?? 0);
  const tpvLCMVal  = Number(tpvLCM._sum.paymentVolume ?? 0);
  const tpvPrevVal = Number(tpvPrevLCM._sum.paymentVolume ?? 0);

  const usBinTPV: KPIMetric = {
    value: tpvValue,
    target: tpvTgt,
    variancePct: tpvTgt ? tpvValue / tpvTgt - 1 : null,
    varianceAbs: tpvTgt ? tpvValue - tpvTgt : null,
    runRate: tpvLCMVal * 12,
    runRateMoMPct: tpvPrevVal > 0 ? tpvLCMVal / tpvPrevVal - 1 : null,
    yoyPct: tpvYoYVal > 0 ? tpvValue / tpvYoYVal - 1 : null,
  };

  return {
    frontbookNR,
    backbookNR,
    totalMR: {
      value: fbValue + bbValue,
      target: fbTgt && bbTgt ? fbTgt + bbTgt : null,
      variancePct: fbTgt && bbTgt ? (fbValue + bbValue) / (fbTgt + bbTgt) - 1 : null,
      varianceAbs: fbTgt && bbTgt ? (fbValue + bbValue) - (fbTgt + bbTgt) : null,
      runRate: (fbLCMVal + bbLCMVal) * 12,
      runRateMoMPct: (fbPrevVal + bbPrevVal) > 0 ? (fbLCMVal + bbLCMVal) / (fbPrevVal + bbPrevVal) - 1 : null,
      yoyPct: (fbYoYVal + bbYoYVal) > 0 ? (fbValue + bbValue) / (fbYoYVal + bbYoYVal) - 1 : null,
    },
    usBinTPV,
  };
}

// ─── Financial Trend (monthly series for charts) ──────────────────────────────

export interface MonthlyPoint {
  month: string;        // 'Jan 26'
  isoMonth: string;     // '2026-01'
  actual: number;
  cumulActual: number;
  baseTarget: number | null;
  rollTarget: number | null;
  cumulBase: number | null;
  cumulRoll: number | null;
}

export async function getFrontbookTrend(filters: DashboardFilters): Promise<MonthlyPoint[]> {
  const year = filters.startDate.getUTCFullYear();
  const janStart = new Date(Date.UTC(year, 0, 1));
  const decEnd   = new Date(Date.UTC(year, 11, 31));

  // Monthly FB actuals
  const actuals = await prisma.financialActual.groupBy({
    by: ['reportingMonth'],
    where: {
      bookType: 'FRONTBOOK',
      reportingMonth: { gte: janStart, lte: filters.endDate },
      account: {
        ...SOLIDGATE_FILTER,
        ...(filters.tier ? { tier: filters.tier as any } : {}),
      },
    },
    _sum: { totalFeeIncGrossFX: true },
    orderBy: { reportingMonth: 'asc' },
  });

  // All targets for the year
  const [baseTargets, rollTargets] = await Promise.all([
    prisma.target.findMany({ where: { type: 'FRONTBOOK_NR', period: { gte: janStart, lte: decEnd } }, orderBy: { period: 'asc' } }),
    prisma.target.findMany({ where: { type: 'FRONTBOOK_NR_CUMUL', period: { gte: janStart, lte: decEnd } }, orderBy: { period: 'asc' } }),
  ]);

  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const points: MonthlyPoint[] = [];
  let cumulActual = 0;

  for (let m = 0; m < 12; m++) {
    const periodKey = `${year}-${String(m + 1).padStart(2, '0')}`;
    const actual = actuals.find((a: typeof actuals[number]) => {
      const d = new Date(a.reportingMonth);
      return d.getUTCFullYear() === year && d.getUTCMonth() === m;
    });
    const base = baseTargets.find((t: typeof baseTargets[number]) => new Date(t.period).getUTCMonth() === m);
    const roll = rollTargets.find((t: typeof rollTargets[number]) => new Date(t.period).getUTCMonth() === m);

    const monthActual = Number(actual?._sum.totalFeeIncGrossFX ?? 0);
    cumulActual += monthActual;

    points.push({
      month: `${MONTH_LABELS[m]} ${String(year).slice(2)}`,
      isoMonth: periodKey,
      actual: monthActual,
      cumulActual,
      baseTarget: base ? Number(base.amount) * 1000 : null,
      rollTarget: null, // FB has incremental + cumul; roll stored as cumul
      cumulBase: null,
      cumulRoll: roll ? Number(roll.amount) * 1000 : null,
    });
  }

  return points;
}

export async function getBackbookTrend(filters: DashboardFilters): Promise<MonthlyPoint[]> {
  const year = filters.startDate.getUTCFullYear();
  const janStart = new Date(Date.UTC(year, 0, 1));
  const decEnd   = new Date(Date.UTC(year, 11, 31));

  const actuals = await prisma.financialActual.groupBy({
    by: ['reportingMonth'],
    where: {
      bookType: 'BACKBOOK',
      reportingMonth: { gte: janStart, lte: filters.endDate },
      account: {
        ...SOLIDGATE_FILTER,
        goLiveDate: { lt: new Date('2026-01-01') },
        ...(filters.tier ? { tier: filters.tier as any } : {}),
      },
    },
    _sum: { totalFeeIncGrossFX: true },
    orderBy: { reportingMonth: 'asc' },
  });

  const bbTargets = await prisma.target.findMany({
    where: { type: 'BACKBOOK_NR', period: { gte: janStart, lte: decEnd } },
    orderBy: { period: 'asc' },
  });

  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const points: MonthlyPoint[] = [];
  let cumulActual = 0;

  for (let m = 0; m < 12; m++) {
    const periodKey = `${year}-${String(m + 1).padStart(2, '0')}`;
    const actual = actuals.find((a: typeof actuals[number]) => new Date(a.reportingMonth).getUTCMonth() === m);
    const tgt = bbTargets.find((t: typeof bbTargets[number]) => new Date(t.period).getUTCMonth() === m);

    const monthActual = Number(actual?._sum.totalFeeIncGrossFX ?? 0);
    cumulActual += monthActual;

    points.push({
      month: `${MONTH_LABELS[m]} ${String(year).slice(2)}`,
      isoMonth: periodKey,
      actual: monthActual,
      cumulActual,
      baseTarget: tgt ? Number(tgt.amount) * 1_000_000 : null,
      rollTarget: null,
      cumulBase: null,
      cumulRoll: null,
    });
  }

  return points;
}

export async function getTPVByMonth(filters: DashboardFilters): Promise<{ month: string; isoMonth: string; volume: number }[]> {
  const year = filters.startDate.getUTCFullYear();
  const janStart = new Date(Date.UTC(year, 0, 1));

  const rows = await prisma.tpvActual.groupBy({
    by: ['reportDate'],
    where: { reportDate: { gte: janStart, lte: filters.endDate } },
    _sum: { paymentVolume: true },
    orderBy: { reportDate: 'asc' },
  });

  // Collapse daily rows into monthly buckets
  const monthMap = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.reportDate);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + Number(r._sum.paymentVolume ?? 0));
  }

  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return Array.from(monthMap.entries()).map(([isoMonth, volume]) => {
    const m = parseInt(isoMonth.split('-')[1]) - 1;
    return { month: `${MONTH_LABELS[m]} ${isoMonth.split('-')[0].slice(2)}`, isoMonth, volume };
  });
}
