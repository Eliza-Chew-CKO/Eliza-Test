/**
 * pipelineService.ts
 *
 * Handles all pipeline (Opportunity) database queries.
 *
 * Key Prisma queries this service will execute once wired up:
 *
 * getOpportunities:
 *   prisma.opportunity.findMany({
 *     where: {
 *       ...(filters.stage ? { stage: filters.stage } : {}),
 *       ...(filters.repId ? { salesRepId: filters.repId } : {}),
 *       ...(filters.tier ? { account: { tier: filters.tier } } : {}),
 *       closeDate: { gte: periodStart, lte: periodEnd },
 *     },
 *     include: { account: { select: { alias: true, tier: true } }, salesRep: { select: { name: true } } },
 *     orderBy: { weightedExpectedMNR: 'desc' },
 *   });
 *
 * getPipelineFunnel:
 *   prisma.opportunity.groupBy({
 *     by: ['stage'],
 *     _count: { id: true },
 *     _sum: { weightedExpectedMNR: true },
 *     where: { stage: { not: 'Closed Lost' }, ...dateFilter },
 *     orderBy: { stage: 'asc' },
 *   });
 *
 * Weighted MNR calculation:
 *   weightedExpectedMNR = baseMonthlyRevenue * stageMultiplier
 *   Stage multipliers: Discovery=0.1, Scoping=0.25, Proposal=0.5, Negotiation=0.75, Closed Won=1.0
 */

import type { DashboardFilters } from '../middleware/filters';

interface OpportunityFilters extends DashboardFilters {
  stage?: string;
}

export interface Opportunity {
  id: string;
  accountId: string;
  salesRepId: string;
  stage: string;
  type: string;
  baseMonthlyRevenue: number;
  rollMonthlyRevenue: number;
  weightedExpectedMNR: number;
  closeDate: string;
  goLiveDate: string | null;
  rating: string | null;
  secondOwnerId: string | null;
  stageHistory: object[];
  createdAt: string;
  updatedAt: string;
}

export interface FunnelStage {
  stage: string;
  count: number;
  value: number;
}

/**
 * Returns a list of open pipeline opportunities matching the given filters.
 */
export async function getOpportunities(_filters: OpportunityFilters): Promise<Opportunity[]> {
  // TODO: replace with real Prisma findMany query (see JSDoc above)
  return [
    {
      id: 'opp_001',
      accountId: 'ACME Corp',
      salesRepId: 'rep_001',
      stage: 'Proposal',
      type: 'New Logo',
      baseMonthlyRevenue: 25_000,
      rollMonthlyRevenue: 28_000,
      weightedExpectedMNR: 12_500,
      closeDate: '2025-07-31T00:00:00Z',
      goLiveDate: null,
      rating: 'Hot',
      secondOwnerId: null,
      stageHistory: [],
      createdAt: '2025-04-15T09:00:00Z',
      updatedAt: '2025-06-01T14:30:00Z',
    },
    {
      id: 'opp_002',
      accountId: 'Global Retail Inc',
      salesRepId: 'rep_002',
      stage: 'Negotiation',
      type: 'New Logo',
      baseMonthlyRevenue: 40_000,
      rollMonthlyRevenue: 45_000,
      weightedExpectedMNR: 30_000,
      closeDate: '2025-06-30T00:00:00Z',
      goLiveDate: null,
      rating: 'Hot',
      secondOwnerId: 'rep_003',
      stageHistory: [],
      createdAt: '2025-03-01T09:00:00Z',
      updatedAt: '2025-06-10T11:00:00Z',
    },
    {
      id: 'opp_003',
      accountId: 'TechStart Ltd',
      salesRepId: 'rep_003',
      stage: 'Discovery',
      type: 'New Logo',
      baseMonthlyRevenue: 8_000,
      rollMonthlyRevenue: 9_500,
      weightedExpectedMNR: 800,
      closeDate: '2025-09-30T00:00:00Z',
      goLiveDate: null,
      rating: 'Warm',
      secondOwnerId: null,
      stageHistory: [],
      createdAt: '2025-06-01T09:00:00Z',
      updatedAt: '2025-06-05T09:00:00Z',
    },
  ];
}

/**
 * Returns aggregated deal counts and weighted MNR per stage for the funnel chart.
 */
export async function getPipelineFunnel(_filters: DashboardFilters): Promise<FunnelStage[]> {
  // TODO: replace with real Prisma groupBy query (see JSDoc above)
  return [
    { stage: 'Discovery',   count: 12, value:  96_000 },
    { stage: 'Scoping',     count:  8, value: 160_000 },
    { stage: 'Proposal',    count:  5, value: 250_000 },
    { stage: 'Negotiation', count:  3, value: 225_000 },
    { stage: 'Closed Won',  count:  2, value: 200_000 },
  ];
}
