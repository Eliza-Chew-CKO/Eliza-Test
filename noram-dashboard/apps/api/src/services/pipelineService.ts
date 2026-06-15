/**
 * pipelineService.ts
 *
 * Pipeline / frontbook opportunity data access layer.
 *
 * When Prisma is connected, these functions will query the Opportunity table
 * with related Account and User data.
 *
 * Current state: returns typed mock data for development / scaffolding.
 */

import type { DashboardFilters } from '../middleware/filters';

export interface OpportunityRecord {
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
  stageHistory: Array<{ stage: string; enteredAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface FunnelStage {
  stage: string;
  count: number;
  value: number;
}

interface OpportunityFilters extends Partial<DashboardFilters> {
  stage?: string;
  page?: number;
  pageSize?: number;
  id?: string;
}

const STAGES = ['Discovery', 'Scoping', 'Proposal', 'Negotiation', 'Closed Won'];

// Weighted probability by stage — used for weightedExpectedMNR calculation
const STAGE_WEIGHTS: Record<string, number> = {
  Discovery:    0.1,
  Scoping:      0.25,
  Proposal:     0.5,
  Negotiation:  0.75,
  'Closed Won': 1.0,
};

function generateMockOpportunities(): OpportunityRecord[] {
  return STAGES.flatMap((stage, si) =>
    Array.from({ length: 4 - si }, (_, i) => {
      const base = 15_000 + i * 5_000;
      return {
        id:              `opp-${stage.toLowerCase().replace(/\s/g, '-')}-${i}`,
        accountId:       `account-${si * 4 + i}`,
        salesRepId:      `rep-${(i % 3) + 1}`,
        stage,
        type:            i % 2 === 0 ? 'New Logo' : 'Expansion',
        baseMonthlyRevenue:    base,
        rollMonthlyRevenue:    base * 0.85,
        weightedExpectedMNR:   base * (STAGE_WEIGHTS[stage] ?? 0.5),
        closeDate:       `2025-0${7 + si}-15`,
        goLiveDate:      null,
        rating:          ['A', 'B', 'C'][i % 3],
        secondOwnerId:   null,
        stageHistory:    [{ stage, enteredAt: new Date().toISOString() }],
        createdAt:       '2025-01-10T00:00:00Z',
        updatedAt:       new Date().toISOString(),
      };
    })
  );
}

/**
 * getOpportunities
 *
 * TODO: Replace mock with Prisma query:
 *
 *   prisma.opportunity.findMany({
 *     where: {
 *       stage:      filters.stage   ? { equals: filters.stage }   : undefined,
 *       salesRepId: filters.repId   ? { equals: filters.repId }   : undefined,
 *       closeDate:  filters.startDate
 *         ? { gte: new Date(filters.startDate), lte: new Date(filters.endDate!) }
 *         : undefined,
 *       account: {
 *         tier: filters.tier ? { equals: filters.tier } : undefined,
 *       },
 *     },
 *     include: { account: true, salesRep: true },
 *     skip:  (page - 1) * pageSize,
 *     take:  pageSize,
 *     orderBy: { weightedExpectedMNR: 'desc' },
 *   })
 *
 * The weightedExpectedMNR is stored in the DB (computed at ingest time from
 * stage probability × baseMonthlyRevenue).
 */
export async function getOpportunities(
  filters: OpportunityFilters
): Promise<{ opportunities: OpportunityRecord[]; total: number }> {
  let opps = generateMockOpportunities();

  if (filters.id) {
    opps = opps.filter((o) => o.id === filters.id);
    return { opportunities: opps, total: opps.length };
  }
  if (filters.stage) {
    opps = opps.filter((o) => o.stage === filters.stage);
  }
  if (filters.repId) {
    opps = opps.filter((o) => o.salesRepId === filters.repId);
  }

  const page     = filters.page     ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const paginated = opps.slice((page - 1) * pageSize, page * pageSize);

  return { opportunities: paginated, total: opps.length };
}

/**
 * getPipelineFunnel
 *
 * TODO: Replace with Prisma groupBy:
 *
 *   prisma.opportunity.groupBy({
 *     by: ['stage'],
 *     _count: { _all: true },
 *     _sum:   { weightedExpectedMNR: true },
 *     where:  buildWhereClause(filters),
 *   })
 */
export async function getPipelineFunnel(
  filters: Partial<DashboardFilters>
): Promise<FunnelStage[]> {
  const opps = (await getOpportunities(filters as OpportunityFilters)).opportunities;

  return STAGES.map((stage) => {
    const stageOpps = opps.filter((o) => o.stage === stage);
    return {
      stage,
      count: stageOpps.length,
      value: stageOpps.reduce((sum, o) => sum + o.weightedExpectedMNR, 0),
    };
  });
}
