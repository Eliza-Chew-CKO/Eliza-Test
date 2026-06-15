/**
 * backbookService.ts
 *
 * Backbook account data access layer.
 *
 * When Prisma is connected, these functions will join Account with
 * FinancialActual (latest month) and VampRecord to surface revenue
 * and VAMP metrics per account.
 *
 * Current state: returns typed mock data.
 */

import type { DashboardFilters } from '../middleware/filters';

export interface AccountRecord {
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
  // Enriched from FinancialActual
  netRevenueMTD?: number;
  tpvMTD?: number;
  // Enriched from VampRecord
  vampRatio?: number;
}

export interface BackbookSummary {
  managed: {
    count: number;
    netRevenue: number;
    tpv: number;
    avgVampRatio: number;
  };
  unmanaged: {
    count: number;
    netRevenue: number;
    tpv: number;
    avgVampRatio: number;
  };
}

interface AccountFilters extends Partial<DashboardFilters> {
  region?: string;
  managed?: boolean;
}

function generateMockAccounts(): AccountRecord[] {
  const tiers = ['Enterprise', 'Mid-Market', 'SMB'];
  const regions = ['US East', 'US West', 'US Central', 'Canada'];

  return Array.from({ length: 20 }, (_, i) => ({
    id:              `acct-${i + 1}`,
    alias:           `Account ${String(i + 1).padStart(3, '0')}`,
    tier:            tiers[i % 3],
    isManaged:       i % 3 !== 2, // SMB = unmanaged
    salesRepId:      `rep-${(i % 4) + 1}`,
    accountManagerId: i % 3 !== 2 ? `am-${(i % 2) + 1}` : null,
    goLiveDate:      i < 15 ? `2024-0${(i % 9) + 1}-01` : null,
    region:          regions[i % 4],
    referralPartner: i % 5 === 0 ? 'Partner Inc.' : null,
    sector:          ['Retail', 'Travel', 'SaaS', 'Financial Services'][i % 4],
    createdAt:       '2023-06-01T00:00:00Z',
    netRevenueMTD:   20_000 + i * 3_500,
    tpvMTD:          500_000 + i * 80_000,
    vampRatio:       0.001 + (i * 0.0003),
  }));
}

/**
 * getAccounts
 *
 * TODO: Replace mock with Prisma query:
 *
 *   prisma.account.findMany({
 *     where: {
 *       tier:        filters.tier      ? { equals: filters.tier }      : undefined,
 *       salesRepId:  filters.repId     ? { equals: filters.repId }     : undefined,
 *       region:      filters.region    ? { equals: filters.region }    : undefined,
 *       isManaged:   filters.managed   != null ? filters.managed       : undefined,
 *     },
 *     include: {
 *       salesRep: true,
 *       accountManager: true,
 *       // Latest financial actual per account
 *       financials: {
 *         orderBy: { reportingMonth: 'desc' },
 *         take: 1,
 *       },
 *       // Latest VAMP record per account
 *       vampRecords: {
 *         orderBy: { reportingMonth: 'desc' },
 *         take: 1,
 *       },
 *     },
 *   })
 *
 * Then flatten financials[0] and vampRecords[0] into the response shape.
 */
export async function getAccounts(filters: AccountFilters): Promise<AccountRecord[]> {
  let accounts = generateMockAccounts();

  if (filters.tier)            accounts = accounts.filter((a) => a.tier === filters.tier);
  if (filters.repId)           accounts = accounts.filter((a) => a.salesRepId === filters.repId);
  if (filters.region)          accounts = accounts.filter((a) => a.region === filters.region);
  if (filters.managed != null) accounts = accounts.filter((a) => a.isManaged === filters.managed);

  return accounts;
}

/**
 * getBackbookSummary
 *
 * TODO: Replace mock with two Prisma aggregate queries:
 *
 *   const [managedAgg, unmanagedAgg] = await Promise.all([
 *     prisma.financialActual.aggregate({
 *       _sum:  { netRevenue: true, tpvAmount: true },
 *       _count: { id: true },
 *       where: { account: { isManaged: true }, reportingMonth: buildDateFilter(filters) },
 *     }),
 *     prisma.financialActual.aggregate({
 *       _sum:  { netRevenue: true, tpvAmount: true },
 *       _count: { id: true },
 *       where: { account: { isManaged: false }, reportingMonth: buildDateFilter(filters) },
 *     }),
 *   ]);
 *
 *   // Plus a VampRecord average query per group
 */
export async function getBackbookSummary(
  filters: Partial<DashboardFilters>
): Promise<BackbookSummary> {
  const accounts = await getAccounts(filters as AccountFilters);

  const managed   = accounts.filter((a) => a.isManaged);
  const unmanaged = accounts.filter((a) => !a.isManaged);

  function summarise(group: AccountRecord[]) {
    return {
      count:        group.length,
      netRevenue:   group.reduce((s, a) => s + (a.netRevenueMTD ?? 0), 0),
      tpv:          group.reduce((s, a) => s + (a.tpvMTD       ?? 0), 0),
      avgVampRatio: group.length
        ? group.reduce((s, a) => s + (a.vampRatio ?? 0), 0) / group.length
        : 0,
    };
  }

  return { managed: summarise(managed), unmanaged: summarise(unmanaged) };
}
