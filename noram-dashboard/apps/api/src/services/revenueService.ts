/**
 * revenueService.ts
 *
 * Revenue-related business logic and data access layer.
 *
 * When Prisma is connected, these functions will execute real SQL aggregations
 * against the PostgreSQL database via the @noram/db PrismaClient singleton.
 *
 * Current state: returns typed mock data for development / scaffolding.
 */

import type { DashboardFilters } from '../middleware/filters';

export interface KPISummary {
  netRevenue: number;
  netRevenueTarget: number;
  netRevenueVariance: number;
  netRevenueVariancePct: number;
  frontbookMNR: number;
  frontbookTarget: number;
  backbookRevenue: number;
  tpvAmount: number;
  goLiveCount: number;
  vampRatio: number;
}

export interface FinancialTrendPoint {
  month: string;
  actual: number;
  target: number;
  tpv: number;
}

/**
 * getKPISummary
 *
 * TODO: Replace mock with Prisma queries:
 *
 *   const [actuals, targets] = await Promise.all([
 *     prisma.financialActual.aggregate({
 *       _sum: { netRevenue: true, tpvAmount: true },
 *       where: {
 *         reportingMonth: buildDateFilter(filters),
 *         account: {
 *           salesRepId: filters.repId ?? undefined,
 *           tier:       filters.tier  ?? undefined,
 *         },
 *       },
 *     }),
 *     prisma.target.findMany({ where: { period: currentPeriod } }),
 *   ]);
 *
 *   const goLives = await prisma.account.count({
 *     where: { goLiveDate: buildDateFilter(filters) },
 *   });
 *
 *   const vampSummary = await prisma.vampRecord.aggregate({
 *     _sum:  { fraudEvents: true, totalCapturedEvents: true },
 *     where: { reportingMonth: buildDateFilter(filters) },
 *   });
 */
export async function getKPISummary(filters: DashboardFilters): Promise<KPISummary> {
  // Mock data — replace with Prisma aggregation
  void filters; // suppress unused warning until wired up

  const netRevenue       = 875_420;
  const netRevenueTarget = 950_000;
  const variance         = netRevenue - netRevenueTarget;

  return {
    netRevenue,
    netRevenueTarget,
    netRevenueVariance:    variance,
    netRevenueVariancePct: variance / netRevenueTarget,
    frontbookMNR:    112_350,
    frontbookTarget: 120_000,
    backbookRevenue: 763_070,
    tpvAmount:       14_200_000,
    goLiveCount:     7,
    vampRatio:       0.0031,
  };
}

/**
 * getFinancialTrends
 *
 * TODO: Replace mock with Prisma aggregation:
 *
 *   const rows = await prisma.financialActual.groupBy({
 *     by:     ['reportingMonth'],
 *     _sum:   { netRevenue: true, tpvAmount: true },
 *     where:  { /* date range filter * / },
 *     orderBy: { reportingMonth: 'asc' },
 *   });
 *
 *   // Join with Target to get the target for each month
 *   const targets = await prisma.target.findMany({
 *     where: { type: { in: ['BACKBOOK_MANAGED', 'BACKBOOK_UNMANAGED'] } },
 *   });
 */
export async function getFinancialTrends(filters: DashboardFilters): Promise<FinancialTrendPoint[]> {
  void filters;

  const months = [
    'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025',
  ];

  return months.map((month, i) => ({
    month,
    actual: 700_000 + i * 30_000 + Math.floor(Math.random() * 40_000),
    target: 800_000 + i * 25_000,
    tpv:    10_000_000 + i * 500_000 + Math.floor(Math.random() * 1_000_000),
  }));
}

/**
 * getNetRevenue
 *
 * Returns a single net revenue figure for the given filters.
 *
 * TODO: prisma.financialActual.aggregate({
 *   _sum: { netRevenue: true },
 *   where: buildWhereClause(filters),
 * })
 */
export async function getNetRevenue(filters: DashboardFilters): Promise<number> {
  void filters;
  return 875_420;
}
