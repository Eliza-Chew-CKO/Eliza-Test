import { Router, type Request, type Response, type NextFunction } from 'express';
import { parseFilters } from '../middleware/filters';

export const targetsRouter = Router();

type TargetType =
  | 'FRONTBOOK_BASE'
  | 'FRONTBOOK_ROLL'
  | 'BACKBOOK_MANAGED'
  | 'BACKBOOK_UNMANAGED'
  | 'TPV';

/**
 * GET /api/targets
 *
 * Returns target records filtered by period and/or type.
 *
 * Query params:
 *   - period?: 'YYYY-MM' — filter to a specific month's targets
 *   - type?:   TargetType — filter to a specific target category
 *
 * TODO: replace mock data with Prisma query:
 *   prisma.target.findMany({ where: { period, type } })
 */
targetsRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = typeof req.query.period === 'string' ? req.query.period : undefined;
      const type = typeof req.query.type === 'string' ? (req.query.type as TargetType) : undefined;

      // Mock target data — replace with Prisma
      const targets = [
        { id: 't_001', period: '2025-06', type: 'FRONTBOOK_BASE',    amount: 150_000, goLiveCount: 5,    createdAt: '2025-05-31T00:00:00Z' },
        { id: 't_002', period: '2025-06', type: 'FRONTBOOK_ROLL',    amount: 80_000,  goLiveCount: null, createdAt: '2025-05-31T00:00:00Z' },
        { id: 't_003', period: '2025-06', type: 'BACKBOOK_MANAGED',  amount: 620_000, goLiveCount: null, createdAt: '2025-05-31T00:00:00Z' },
        { id: 't_004', period: '2025-06', type: 'BACKBOOK_UNMANAGED',amount: 200_000, goLiveCount: null, createdAt: '2025-05-31T00:00:00Z' },
        { id: 't_005', period: '2025-06', type: 'TPV',               amount: 5_000_000_000, goLiveCount: null, createdAt: '2025-05-31T00:00:00Z' },
      ].filter((t) => {
        if (period && t.period !== period) return false;
        if (type && t.type !== type) return false;
        return true;
      });

      res.json({ success: true, data: targets });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/targets/variance
 *
 * Returns a comparison of actuals vs targets for each TargetType.
 * Used to power variance indicators across the dashboard.
 *
 * Query params:
 *   - dateRange, startDate, endDate (from parseFilters)
 *
 * TODO: replace mock with real Prisma aggregation:
 *   1. Fetch targets for the period
 *   2. Fetch aggregated FinancialActual sums for the same period
 *   3. Join and compute variance per target type
 */
targetsRouter.get(
  '/variance',
  parseFilters,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const variance = [
        {
          type: 'FRONTBOOK_BASE' as TargetType,
          target: 150_000,
          actual: 162_500,
          variance: 12_500,
          variancePct: 0.0833,
        },
        {
          type: 'FRONTBOOK_ROLL' as TargetType,
          target: 80_000,
          actual: 74_200,
          variance: -5_800,
          variancePct: -0.0725,
        },
        {
          type: 'BACKBOOK_MANAGED' as TargetType,
          target: 620_000,
          actual: 637_800,
          variance: 17_800,
          variancePct: 0.0287,
        },
        {
          type: 'BACKBOOK_UNMANAGED' as TargetType,
          target: 200_000,
          actual: 189_100,
          variance: -10_900,
          variancePct: -0.0545,
        },
        {
          type: 'TPV' as TargetType,
          target: 5_000_000_000,
          actual: 4_820_000_000,
          variance: -180_000_000,
          variancePct: -0.036,
        },
      ];

      res.json({ success: true, data: variance });
    } catch (err) {
      next(err);
    }
  },
);
