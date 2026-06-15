import { Router, type Request, type Response } from 'express';
import { parseFilters } from '../middleware/filters';

const router = Router();

type TargetType = 'FRONTBOOK_BASE' | 'FRONTBOOK_ROLL' | 'BACKBOOK_MANAGED' | 'BACKBOOK_UNMANAGED' | 'TPV';

const MOCK_TARGETS = [
  { id: 't1', period: '2025-06', type: 'FRONTBOOK_BASE'      as TargetType, amount: 120_000, goLiveCount: 5,    createdAt: '2025-01-01' },
  { id: 't2', period: '2025-06', type: 'FRONTBOOK_ROLL'      as TargetType, amount: 95_000,  goLiveCount: null, createdAt: '2025-01-01' },
  { id: 't3', period: '2025-06', type: 'BACKBOOK_MANAGED'    as TargetType, amount: 500_000, goLiveCount: null, createdAt: '2025-01-01' },
  { id: 't4', period: '2025-06', type: 'BACKBOOK_UNMANAGED'  as TargetType, amount: 200_000, goLiveCount: null, createdAt: '2025-01-01' },
  { id: 't5', period: '2025-06', type: 'TPV'                 as TargetType, amount: 10_000_000, goLiveCount: null, createdAt: '2025-01-01' },
];

/**
 * GET /api/targets
 *
 * Returns targets filtered by period and/or type.
 *
 * Query params:
 *   period  string  — YYYY-MM format
 *   type    string  — TargetType enum value
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { period, type } = req.query;

    // TODO: prisma.target.findMany({ where: { period, type } })
    let results = MOCK_TARGETS;
    if (period) results = results.filter((t) => t.period === String(period));
    if (type)   results = results.filter((t) => t.type   === String(type));

    res.json({ success: true, data: results });
  } catch (err) {
    console.error('[Targets GET /]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch targets' });
  }
});

/**
 * GET /api/targets/variance
 *
 * Returns actuals vs targets comparison for each target type in the given period.
 * This drives the executive summary variance KPIs.
 *
 * Query params:
 *   period  string  — YYYY-MM format (defaults to current month)
 */
router.get('/variance', parseFilters, async (req: Request, res: Response) => {
  try {
    const period = req.query.period
      ? String(req.query.period)
      : new Date().toISOString().slice(0, 7); // current YYYY-MM

    // TODO: For each TargetType:
    //   1. Fetch Target WHERE period=period AND type=type
    //   2. Aggregate FinancialActual for the matching month/type to get actual
    //   3. Return { type, target, actual, variance, variancePct }
    const variance = MOCK_TARGETS
      .filter((t) => t.period === period)
      .map((t) => {
        const actual  = t.amount * (0.85 + Math.random() * 0.3); // mock actual
        const diff    = actual - t.amount;
        const diffPct = diff / t.amount;
        return {
          type:        t.type,
          period:      t.period,
          target:      t.amount,
          actual:      Math.round(actual),
          variance:    Math.round(diff),
          variancePct: Math.round(diffPct * 10_000) / 10_000,
        };
      });

    res.json({ success: true, data: variance });
  } catch (err) {
    console.error('[Targets /variance]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch target variance' });
  }
});

export default router;
