import { Prisma, prisma } from '../lib/prisma';
import { DashboardFilters, lastCompletedMonthStart } from '../middleware/filters';

export interface RepLeaderboardRow {
  rank: number;
  repName: string;
  mrYTD: number;
  mrLastMonth: number;
  mrYTDPct: number;   // 0–1 relative to top rep (for inline bar)
  tpvYTD: number;
  dealCount: number;
}

export interface ActivityLeaderboardRow {
  rank: number;
  repName: string;
  count: number;
}

// ─── Rep MR leaderboard ───────────────────────────────────────────────────────

export async function getRepMRLeaderboard(filters: DashboardFilters): Promise<RepLeaderboardRow[]> {
  const { startDate, endDate, tier } = filters;
  const lcmStart = lastCompletedMonthStart();
  const lcmEnd   = new Date(Date.UTC(lcmStart.getUTCFullYear(), lcmStart.getUTCMonth() + 1, 0));

  const baseWhere = (dateFrom: Date, dateTo: Date): Prisma.FinancialActualWhereInput => ({
    reportingMonth: { gte: dateFrom, lte: dateTo },
    ...(tier ? { tier: tier as any } : {}),
    account: {
      NOT: { referralPartner: { contains: 'SOLIDGATE', mode: 'insensitive' } },
    },
  });

  // YTD aggregation by salesRepName
  const ytdRows = await prisma.financialActual.groupBy({
    by: ['salesRepName'],
    where: baseWhere(startDate, endDate),
    _sum: { totalFeeIncGrossFX: true, tpvAmount: true },
    orderBy: { _sum: { totalFeeIncGrossFX: 'desc' } },
  });

  // Last month aggregation by salesRepName
  const lmRows = await prisma.financialActual.groupBy({
    by: ['salesRepName'],
    where: baseWhere(lcmStart, lcmEnd),
    _sum: { totalFeeIncGrossFX: true },
  });

  // Deal count (closed won opps)
  const dealCounts = await prisma.opportunity.groupBy({
    by: ['salesRepName'],
    where: {
      normalizedStage: 'CLOSED_WON',
      closeDate: { gte: startDate, lte: endDate },
    },
    _count: { id: true },
  });

  const lmMap = new Map(lmRows.map(r => [r.salesRepName, Number(r._sum.totalFeeIncGrossFX ?? 0)]));
  const dealMap = new Map(dealCounts.map(r => [r.salesRepName, r._count.id]));

  const rows = ytdRows
    .filter(r => r.salesRepName)
    .map(r => ({
      repName: r.salesRepName!,
      mrYTD: Number(r._sum.totalFeeIncGrossFX ?? 0),
      mrLastMonth: lmMap.get(r.salesRepName!) ?? 0,
      tpvYTD: Number(r._sum.tpvAmount ?? 0),
      dealCount: dealMap.get(r.salesRepName!) ?? 0,
    }));

  const maxMR = rows[0]?.mrYTD ?? 1;

  return rows.map((r, i) => ({
    rank: i + 1,
    ...r,
    mrYTDPct: r.mrYTD / maxMR,
  }));
}

// ─── Activity leaderboards (Top 10 by pipeline stage) ─────────────────────────

type ActivityStage = 'explore' | 'propose' | 'trade' | 'handover';

export async function getActivityLeaderboard(stage: ActivityStage, filters: DashboardFilters): Promise<ActivityLeaderboardRow[]> {
  const { startDate, endDate, repName } = filters;

  const repFilter = repName
    ? { salesRepName: { contains: repName, mode: 'insensitive' as const } }
    : {};

  const dateField: Record<ActivityStage, string> = {
    explore:  'firstExploreMeetingDate',
    propose:  'dateSetToPropose',
    trade:    'dateSetToTrade',
    handover: 'dateSetToHandover',
  };

  // Prisma doesn't support groupBy on relation fields directly;
  // use raw query to group by salesRepName and count within date window.
  const field = dateField[stage];

  const rows = await prisma.opportunity.groupBy({
    by: ['salesRepName'],
    where: {
      [field]: { gte: startDate, lte: endDate },
      isNoram: true,
      ...repFilter,
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  return rows
    .filter(r => r.salesRepName)
    .map((r, i) => ({
      rank: i + 1,
      repName: r.salesRepName!,
      count: r._count.id,
    }));
}
