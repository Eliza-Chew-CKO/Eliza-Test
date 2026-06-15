import { Router, type Request, type Response } from 'express';
import { parseFilters } from '../middleware/filters';

const router = Router();

const MOCK_TARGETS = [
  { id: 'tgt_1', period: '2025-06', type: 'FRONTBOOK_BASE',      amount: 300_000, goLiveCount: 8,    createdAt: '2025-01-01T00:00:00Z' },
  { id: 'tgt_2', period: '2025-06', type: 'FRONTBOOK_ROLL',      amount: 50_000,  goLiveCount: null, createdAt: '2025-01-01T00:00:00Z' },
  { id: 'tgt_3', period: '2025-06', type: 'BACKBOOK_MANAGED',    amount: 700_000, goLiveCount: null, createdAt: '2025-01-01T00:00:00Z' },
  { id: 'tgt_4', period: '2025-06', type: 'BACKBOOK_UNMANAGED',  amount: 250_000, goLiveCount: null, createdAt: '2025-01-01T00:00:00Z' },
  { id: 'tgt_5', period: '2025-06', type: 'TPV',                 amount: 90_000_000, goLiveCount: null, createdAt: '2025-01-01T00:00:00Z' },
];

/**
 * GET /api/targets
 * Returns target records filtered by period and/or type.
 *
 * Query params: period (YYYY-MM), type (TargetType enum)
 */
router.get('/', parseFilters, (req: Request, res: Response) => {
  const { period, type } = req.query;

  let results = [...MOCK_TARGETS];

  if (typeof period === 'string' && period) {
    results = results.filter((t) => t.period === period);
  }
  if (typeof type === 'string' && type) {
    results = results.filter((t) => t.type === type);
  }

  res.json({ success: true, data: results });
});

/**
 * GET /api/targets/variance
 * Returns actuals vs targets comparison for each target type.
 * TODO: join with FinancialActual aggregates via Prisma.
 */
router.get('/variance', parseFilters, (_req: Request, res: Response) => {
  const variance = MOCK_TARGETS.map((target) => ({
    ...target,
    actual: target.amount * (0.85 + Math.random() * 0.3), // mock actual
    get variance() {
      return this.actual - this.amount;
    },
    get variancePct() {
      return (this.actual - this.amount) / this.amount;
    },
  }));

  res.json({ success: true, data: variance });
});

export default router;
