import { Router, type Request, type Response } from 'express';
import { parseFilters } from '../middleware/filters';
// TODO: import { getTargets, getTargetVariance } from '../services/revenueService';

const router = Router();

/**
 * GET /api/targets
 *
 * Returns targets filtered by period and/or type.
 * Query params:
 *   - period?: 'YYYY-MM' string to filter to a specific month
 *   - type?:   TargetType enum value
 */
router.get('/', parseFilters, async (req: Request, res: Response) => {
  try {
    const { period, type } = req.query as Record<string, string>;

    // TODO: const targets = await getTargets({ period, type });

    const targetTypes = [
      'FRONTBOOK_BASE',
      'FRONTBOOK_ROLL',
      'BACKBOOK_MANAGED',
      'BACKBOOK_UNMANAGED',
      'TPV',
    ] as const;

    const mockPeriods = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];

    let targets = mockPeriods.flatMap((p, pi) =>
      targetTypes.map((t, ti) => ({
        id:           `target-${pi}-${ti}`,
        period:       p,
        type:         t,
        amount:       t === 'TPV' ? 12_000_000 + pi * 500_000 : 80_000 + ti * 20_000 + pi * 5_000,
        goLiveCount:  t === 'FRONTBOOK_BASE' ? 4 + pi : null,
        createdAt:    new Date().toISOString(),
      }))
    );

    if (period) targets = targets.filter((t) => t.period === period);
    if (type)   targets = targets.filter((t) => t.type   === type);

    res.json({ success: true, data: targets });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error });
  }
});

/**
 * GET /api/targets/variance
 *
 * Returns actuals vs targets comparison grouped by target type for the current period.
 * Useful for showing attainment percentages across frontbook/backbook/TPV dimensions.
 */
router.get('/variance', parseFilters, async (_req: Request, res: Response) => {
  try {
    // TODO: const variance = await getTargetVariance(req.filters);

    const variance = [
      { type: 'FRONTBOOK_BASE',    target: 80_000,      actual: 88_000,      variance: 8_000,      variancePct: 10.0 },
      { type: 'FRONTBOOK_ROLL',    target: 110_000,     actual: 104_500,     variance: -5_500,     variancePct: -5.0 },
      { type: 'BACKBOOK_MANAGED',  target: 285_000,     actual: 310_000,     variance: 25_000,     variancePct: 8.77 },
      { type: 'BACKBOOK_UNMANAGED',target: 100_000,     actual: 95_000,      variance: -5_000,     variancePct: -5.0 },
      { type: 'TPV',               target: 12_000_000,  actual: 12_500_000,  variance: 500_000,    variancePct: 4.17 },
    ];

    res.json({ success: true, data: variance });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error });
  }
});

export default router;
