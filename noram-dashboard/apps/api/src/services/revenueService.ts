/**
 * Revenue Service
 *
 * Handles all revenue-related data access. In production, each function runs
 * Prisma queries against the FinancialActual, Target, and related tables.
 * Currently returns typed mock data while the database is being wired up.
 */

import type { ParsedFilters } from '../middleware/filters';

// ── Types (mirrors the frontend types) ────────────────────────────────────────

export interface KPISummaryResult {
  netRevenue: number;
  netRevenueTarget: number;
  netRevenueVariance: number;
  netRevenueVariancePct: number;
  frontbookMNR: number;
  frontbookTarget: number;
  backbookRevenue: number;
  tpvAmount: number;
  goLiveCount: number;
  vampRatioAvg: number;
}

export interface FinancialTrendPoint {
  month: string;
  actual: number;
  target: number;
  tpv: number;
}

// ── Service functions ──────────────────────────────────────────────────────────

/**
 * Returns the executive KPI summary for the given period and filters.
 *
 * Production query:
 *   SELECT SUM(netRevenue) as netRevenue, SUM(tpvAmount) as tpvAmount
 *   FROM FinancialActual
 *   WHERE reportingMonth BETWEEN :start AND :end
 *     AND (account.salesRepId = :repId OR :repId IS NULL)
 *     AND (account.tier = :tier OR :tier IS NULL)
 *
 * Joined with Target table to retrieve netRevenueTarget per period/type.
 * Joined with VampRecord to compute vampRatioAvg.
 * Joined with Opportunity (stage=CLOSED_WON, goLiveDate IN period) for goLiveCount.
 */
export async function getKPISummary(_filters: ParsedFilters): Promise<KPISummaryResult> {
  // TODO: Replace with Prisma aggregation
  return {
    netRevenue: 425_000,
    netRevenueTarget: 400_000,
    netRevenueVariance: 25_000,
    netRevenueVariancePct: 6.25,
    frontbookMNR: 180_000,
    frontbookTarget: 165_000,
    backbookRevenue: 245_000,
    tpvAmount: 12_500_000,
    goLiveCount: 14,
    vampRatioAvg: 0.0032,
  };
}

/**
 * Returns monthly revenue actuals vs targets for trend charts.
 *
 * Production query:
 *   SELECT DATE_TRUNC('month', reportingMonth) as month,
 *          SUM(netRevenue) as actual,
 *          SUM(tpvAmount) as tpv
 *   FROM FinancialActual
 *   WHERE reportingMonth BETWEEN :yearStart AND :now
 *   GROUP BY 1
 *   ORDER BY 1 ASC
 *
 * Joined with Target (type=FRONTBOOK_ROLL or BACKBOOK_*) to get target per month.
 */
export async function getFinancialTrends(_filters: ParsedFilters): Promise<FinancialTrendPoint[]> {
  // TODO: Replace with Prisma groupBy + join
  const months = [
    'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025',
  ];
  return months.map((month, i) => ({
    month,
    actual: 350_000 + i * 15_000,
    target: 360_000 + i * 10_000,
    tpv: 10_500_000 + i * 350_000,
  }));
}

/**
 * Returns net revenue aggregated over the requested period.
 *
 * Production query:
 *   SELECT SUM(netRevenue) FROM FinancialActual
 *   WHERE reportingMonth BETWEEN :start AND :end
 *     AND accountId IN (
 *       SELECT id FROM Account WHERE salesRepId = :repId AND tier = :tier
 *     )
 */
export async function getNetRevenue(_filters: ParsedFilters): Promise<number> {
  // TODO: Replace with Prisma aggregate
  return 425_000;
}
