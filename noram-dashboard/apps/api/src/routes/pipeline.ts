import { Router, type Request, type Response } from 'express';
import { parseFilters } from '../middleware/filters';
// TODO: import { getOpportunities } from '../services/pipelineService';

const router = Router();

// Stub opportunity data
const MOCK_OPPORTUNITIES = Array.from({ length: 20 }, (_, i) => ({
  id: `opp_${i + 1}`,
  accountId: `acc_${(i % 8) + 1}`,
  salesRepId: `rep_${(i % 4) + 1}`,
  stage: ['Discovery', 'Scoping', 'Proposal', 'Negotiation', 'Closed Won'][i % 5],
  type: i % 3 === 0 ? 'Expansion' : 'New Logo',
  baseMonthlyRevenue: 10_000 + i * 5_000,
  rollMonthlyRevenue: 12_000 + i * 5_500,
  weightedExpectedMNR: (10_000 + i * 5_000) * [0.1, 0.2, 0.4, 0.7, 1.0][i % 5],
  closeDate: new Date(2025, 6 + (i % 6), 15).toISOString(),
  goLiveDate: null,
  rating: ['Hot', 'Warm', 'Cold'][i % 3],
  secondOwnerId: null,
  stageHistory: [],
  createdAt: new Date(2025, 0, i + 1).toISOString(),
  updatedAt: new Date(2025, 3, i + 1).toISOString(),
}));

/**
 * GET /api/pipeline
 * Returns a paginated, filtered list of open opportunities.
 *
 * Query params:
 *   stage      Filter by pipeline stage
 *   repId      Filter by sales rep
 *   dateRange  Date range filter applied to closeDate
 *   page       Page number (default: 1)
 *   pageSize   Results per page (default: 20)
 */
router.get('/', parseFilters, (req: Request, res: Response) => {
  const { stage, repId } = req.query;
  // TODO: replace with pipelineService.getOpportunities(req.parsedFilters)

  let results = [...MOCK_OPPORTUNITIES];

  // Stage filter stub
  if (typeof stage === 'string' && stage) {
    results = results.filter((o) => o.stage === stage);
  }

  // Rep filter stub
  if (typeof repId === 'string' && repId) {
    results = results.filter((o) => o.salesRepId === repId);
  }

  const page = parseInt(String(req.query.page ?? '1'), 10);
  const pageSize = parseInt(String(req.query.pageSize ?? '20'), 10);
  const start = (page - 1) * pageSize;

  res.json({
    success: true,
    data: results.slice(start, start + pageSize),
    meta: { total: results.length, page, pageSize },
  });
});

/**
 * GET /api/pipeline/:id
 * Returns a single opportunity by ID.
 */
router.get('/:id', (req: Request, res: Response) => {
  const opp = MOCK_OPPORTUNITIES.find((o) => o.id === req.params.id);
  if (!opp) {
    return res.status(404).json({ success: false, error: 'Opportunity not found' });
  }
  return res.json({ success: true, data: opp });
});

export default router;
