/**
 * Backbook Service
 *
 * Handles data access for backbook (existing/live) accounts.
 *
 * Key data relationships:
 *   Account ─── FinancialActual (1:many, joined on accountId + reportingMonth)
 *   Account ─── VampRecord      (1:many, joined on accountId + reportingMonth)
 *   Account ─── User            (salesRep, accountManager)
 *
 * "Backbook" refers to accounts that are already live (goLiveDate is set and
 * in the past), as opposed to "frontbook" which refers to pipeline/new logos.
 */

// TODO: import { prisma } from '@noram/db';

export interface BackbookFilters {
  tier?: string;
  repId?: string;
  region?: string;
  isManaged?: boolean;
  dateRange?: 'MTD' | 'YTD' | 'CUSTOM';
  startDate?: string;
  endDate?: string;
}

export interface AccountWithMetrics {
  id: string;
  alias: string;
  tier: string;
  isManaged: boolean;
  salesRepId: string;
  accountManagerId: string | null;
  goLiveDate: string | null;
  region: string;
  referralPartner: string | null;
  sector: string | null;
  createdAt: string;
  netRevenueMTD: number;
  tpvAmount: number;
  vampRatio: number | null;
}

/**
 * getAccounts
 *
 * Intended Prisma query:
 *   prisma.account.findMany({
 *     where: {
 *       goLiveDate: { not: null, lte: new Date() },
 *       ...(filters.tier      ? { tier: filters.tier }           : {}),
 *       ...(filters.repId     ? { salesRepId: filters.repId }    : {}),
 *       ...(filters.region    ? { region: filters.region }       : {}),
 *       ...(filters.isManaged !== undefined
 *           ? { isManaged: filters.isManaged }
 *           : {}),
 *     },
 *     include: {
 *       financials: {
 *         where: { reportingMonth: { gte: periodStart, lte: periodEnd } },
 *         select: { netRevenue: true, tpvAmount: true },
 *       },
 *       vampRecords: {
 *         where: { reportingMonth: { gte: periodStart, lte: periodEnd } },
 *         select: { vampRatio: true },
 *       },
 *       salesRep: true,
 *     },
 *   })
 *
 * After fetching, aggregate:
 *   netRevenueMTD = SUM(financials.netRevenue)
 *   tpvAmount     = SUM(financials.tpvAmount)
 *   vampRatio     = AVG(vampRecords.vampRatio) or latest
 */
export async function getAccounts(
  _filters: BackbookFilters
): Promise<AccountWithMetrics[]> {
  // TODO: replace with Prisma query + aggregation
  return [];
}

export interface BackbookSummary {
  managed: { count: number; netRevenue: number; tpv: number };
  unmanaged: { count: number; netRevenue: number; tpv: number };
}

/**
 * getBackbookSummary
 *
 * Intended Prisma query:
 *   Two separate aggregations (managed=true / managed=false):
 *   prisma.account.aggregate({
 *     where: { isManaged: true, goLiveDate: { not: null } },
 *     _count: { id: true },
 *   }) combined with a SUM on related FinancialActual rows.
 *
 *   Alternatively, use a raw query or groupBy on isManaged.
 */
export async function getBackbookSummary(
  _filters: BackbookFilters
): Promise<BackbookSummary> {
  // TODO: replace with Prisma aggregation
  return {
    managed:   { count: 18, netRevenue: 925_000, tpv: 60_000_000 },
    unmanaged: { count: 7,  netRevenue: 320_000, tpv: 24_500_000 },
  };
}
