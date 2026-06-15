/**
 * revenueService.ts
 *
 * Handles all revenue-related database queries. Once Prisma is wired up,
 * these functions will query the FinancialActual table (and join to Account,
 * Target, and User) to compute the KPIs and trends shown on the dashboard.
 *
 * Query strategy:
 * - MTD:    reportingMonth = current month's first day
 * - YTD:    reportingMonth >= first day of current year
 * - CUSTOM: reportingMonth >= startDate AND reportingMonth <= endDate
 *
 * All monetary values are returned as JavaScript numbers (converted from Prisma Decimal).
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

export interface TrendDataPoint {
  month: string;
  actual: number;
  target: number;
  tpv: number;
}

/**
 * getKPISummary
 *
 * Real implementation would run:
 *
 *   const financials = await prisma.financialActual.aggregate({
 *     _sum: { netRevenue: true, tpvAmount: true, totalFees: true },
 *     where: buildDateWhereClause(filters),
 *   });
 *
 *   const target = await prisma.target.findFirst({
 *     where: { period: currentPeriod, type: 'BACKBOOK_MANAGED' },
 *   });
 *
 *   const goLives = await prisma.account.count({
 *     where: {
 *       goLiveDate: { gte: periodStart, lte: periodEnd },
 *       ...(filters.repId ? { salesRepId: filters.repId } : {}),
 *     },
 *   });
 */
export async function getKPISummary(_filters: DashboardFilters): Promise<KPISummary> {
  // TODO: replace with real Prisma aggregation queries (see JSDoc above)
  return {
    netRevenue:           1_063_600,
    netRevenueTarget:     1_050_000,
    netRevenueVariance:      13_600,
    netRevenueVariancePct:    0.013,
    frontbookMNR:           162_500,
    frontbookTarget:        150_000,
    backbookRevenue:        826_900,
    tpvAmount:        4_820_000_000,
    goLiveCount:                  4,
    vampRatio:               0.0072,
  };
}

/**
 * getFinancialTrends
 *
 * Real implementation would run one query per month in the requested range
 * (or a single query grouped by reportingMonth):
 *
 *   const results = await prisma.financialActual.groupBy({
 *     by: ['reportingMonth'],
 *     _sum: { netRevenue: true, tpvAmount: true },
 *     where: buildDateWhereClause(filters),
 *     orderBy: { reportingMonth: 'asc' },
 *   });
 *
 *   Then join with Target records to get the target per month.
 */
export async function getFinancialTrends(_filters: DashboardFilters): Promise<TrendDataPoint[]> {
  // TODO: replace with real Prisma groupBy query (see JSDoc above)
  return [
    { month: 'Jan 2025', actual:  890_000, target:  920_000, tpv: 3_900_000_000 },
    { month: 'Feb 2025', actual:  935_000, target:  940_000, tpv: 4_100_000_000 },
    { month: 'Mar 2025', actual:  978_000, target:  960_000, tpv: 4_300_000_000 },
    { month: 'Apr 2025', actual: 1_010_000, target: 1_000_000, tpv: 4_550_000_000 },
    { month: 'May 2025', actual: 1_042_000, target: 1_030_000, tpv: 4_750_000_000 },
    { month: 'Jun 2025', actual: 1_063_600, target: 1_050_000, tpv: 4_820_000_000 },
  ];
}

/**
 * getNetRevenue
 *
 * A focused helper for computing net revenue for a given set of filters.
 * Used internally and by other services that need a revenue figure for attribution.
 *
 * Real implementation:
 *   const result = await prisma.financialActual.aggregate({
 *     _sum: { netRevenue: true },
 *     where: {
 *       ...buildDateWhereClause(filters),
 *       ...(filters.repId ? { account: { salesRepId: filters.repId } } : {}),
 *       ...(filters.tier ? { account: { tier: filters.tier } } : {}),
 *     },
 *   });
 *   return Number(result._sum.netRevenue ?? 0);
 */
export async function getNetRevenue(_filters: DashboardFilters): Promise<number> {
  // TODO: replace with real Prisma query
  return 1_063_600;
}
