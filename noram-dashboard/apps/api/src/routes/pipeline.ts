import { Router, type Request, type Response } from 'express';
import { parseFilters } from '../middleware/filters';
// TODO: Wire to real service once Prisma is connected
// import { getOpportunities, getPipelineFunnel } from '../services/pipelineService';

const router = Router();

/** Mock opportunity generator */
function mockOpportunities(count: number) {
  const stages = ['Discovery', 'Scoping', 'Proposal', 'Negotiation', 'Closed Won'];
  const types = ['New Logo', 'Expansion', 'Renewal'];
  const ratings = ['Hot', 'Warm', 'Cold'];

  return Array.from({ length: count }, (_, i) => ({
    id: `opp-${i + 1}`,
    accountId: `account-${(i % 10) + 1}`,
    salesRepId: `rep-${(i % 4) + 1}`,
    stage: stages[i % stages.length],
    type: types[i % types.length],
    baseMonthlyRevenue: 5_000 + i * 1_200,
    rollMonthlyRevenue: 6_500 + i * 1_200,
    weightedExpectedMNR: (5_000 + i * 1_200) * 0.65,
    closeDate: new Date(2025, (i % 6) + 6, 15).toISOString(),
    goLiveDate: null,
    rating: ratings[i % ratings.length],
    secondOwnerId: null,
    stageHistory: [],
    createdAt: new Date(2025, i % 12, 1).toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * GET /api/pipeline
 *
 * Returns a paginated list of open opportunities.
 * Filter params: dateRange, repId, tier
 * Pagination: page (default 1), pageSize (default 20)
 */
router.get('/', parseFilters, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string ?? '1', 10);
    const pageSize = parseInt(req.query.pageSize as string ?? '20', 10);
    const { repId, tier } = req.parsedFilters;

    // TODO: Replace mock with: const opps = await getOpportunities(req.parsedFilters, { page, pageSize });
    let opps = mockOpportunities(50);

    // Apply filter stubs
    if (repId) {
      opps = opps.filter((o) => o.salesRepId === repId);
    }
    // tier filter would join to Account model in real implementation

    const total = opps.length;
    const paginated = opps.slice((page - 1) * pageSize, page * pageSize);

    res.json({
      success: true,
      data: paginated,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error });
  }
});

/**
 * GET /api/pipeline/:id
 *
 * Returns a single opportunity by ID including full stageHistory.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // TODO: Replace with: const opp = await pipelineService.getOpportunityById(id);
    const opps = mockOpportunities(50);
    const opp = opps.find((o) => o.id === id);

    if (!opp) {
      return res.status(404).json({ success: false, error: `Opportunity ${id} not found` });
    }

    res.json({ success: true, data: opp });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error });
  }
});

export default router;
