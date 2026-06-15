/**
 * backbookService.ts
 *
 * Handles all backbook (existing account) database queries.
 *
 * Key Prisma queries this service will execute once wired up:
 *
 * getAccounts:
 *   prisma.account.findMany({
 *     where: {
 *       ...(filters.repId ? { salesRepId: filters.repId } : {}),
 *       ...(filters.tier ? { tier: filters.tier } : {}),
 *       ...(filters.region ? { region: filters.region } : {}),
 *       ...(filters.managed !== undefined ? { isManaged: filters.managed } : {}),
 *     },
 *     include: {
 *       financials: {
 *         where: { reportingMonth: currentMonthStart },
 *         select: { netRevenue: true, tpvAmount: true },
 *         take: 1,
 *         orderBy: { reportingMonth: 'desc' },
 *       },
 *       vampRecords: {
 *         where: { reportingMonth: currentMonthStart },
 *         select: { vampRatio: true },
 *         take: 1,
 *         orderBy: { reportingMonth: 'desc' },
 *       },
 *       salesRep: { select: { name: true } },
 *     },
 *   });
 *
 * getBackbookSummary:
 *   Two aggregations on FinancialActual:
 *   1. WHERE account.isManaged = true  → sum netRevenue
 *   2. WHERE account.isManaged = false → sum netRevenue
 *   Plus account counts.
 */

import type { DashboardFilters } from '../middleware/filters';

interface AccountFilters extends DashboardFilters {
  region?: string;
  managed?: boolean;
}

export interface AccountWithFinancials {
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
  // Joined financial data
  netRevenueMTD: number;
  tpvAmount: number;
  vampRatio: number | null;
}

export interface BackbookSummary {
  managedCount: number;
  unmanagedCount: number;
  managedRevenue: number;
  unmanagedRevenue: number;
  totalRevenue: number;
}

/**
 * Returns accounts enriched with their latest monthly financials and VAMP ratio.
 */
export async function getAccounts(_filters: AccountFilters): Promise<AccountWithFinancials[]> {
  // TODO: replace with real Prisma query joining Account + FinancialActual + VampRecord
  return [
    {
      id: 'acc_001',
      alias: 'ACME Payments',
      tier: 'Enterprise',
      isManaged: true,
      salesRepId: 'rep_001',
      accountManagerId: 'am_001',
      goLiveDate: '2024-03-15T00:00:00Z',
      region: 'US East',
      referralPartner: null,
      sector: 'Retail',
      createdAt: '2024-01-10T00:00:00Z',
      netRevenueMTD: 142_000,
      tpvAmount: 620_000_000,
      vampRatio: 0.0045,
    },
    {
      id: 'acc_002',
      alias: 'QuickShop',
      tier: 'Mid-Market',
      isManaged: false,
      salesRepId: 'rep_002',
      accountManagerId: null,
      goLiveDate: '2024-07-01T00:00:00Z',
      region: 'US West',
      referralPartner: 'PartnerCo',
      sector: 'E-commerce',
      createdAt: '2024-05-20T00:00:00Z',
      netRevenueMTD: 38_000,
      tpvAmount: 92_000_000,
      vampRatio: 0.0112,
    },
    {
      id: 'acc_003',
      alias: 'NorthStar Travel',
      tier: 'Enterprise',
      isManaged: true,
      salesRepId: 'rep_001',
      accountManagerId: 'am_002',
      goLiveDate: '2023-11-01T00:00:00Z',
      region: 'Canada',
      referralPartner: null,
      sector: 'Travel',
      createdAt: '2023-09-15T00:00:00Z',
      netRevenueMTD: 95_000,
      tpvAmount: 410_000_000,
      vampRatio: 0.0031,
    },
  ];
}

/**
 * Returns a high-level summary of managed vs unmanaged revenue.
 */
export async function getBackbookSummary(_filters: DashboardFilters): Promise<BackbookSummary> {
  // TODO: replace with two Prisma aggregate queries (see JSDoc above)
  return {
    managedCount:    18,
    unmanagedCount:  34,
    managedRevenue:  637_800,
    unmanagedRevenue: 189_100,
    totalRevenue:    826_900,
  };
}
