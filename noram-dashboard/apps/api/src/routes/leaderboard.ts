import { Router, type Request, type Response, type NextFunction } from 'express';
import { parseFilters } from '../middleware/filters';

export const leaderboardRouter = Router();

interface LeaderboardRow {
  rank: number;
  rep: {
    id: string;
    name: string;
    email: string;
    role: string;
    salesRegion: string;
    createdAt: string;
  };
  revenue: number;
  target: number;
  deals: number;
}

/**
 * GET /api/leaderboard
 *
 * Returns a ranked list of sales reps with their revenue actuals, targets, and deal counts.
 * Sorted by revenue descending by default. Supports re-sorting by deals via `sortBy` param.
 *
 * Query params:
 *   - dateRange, startDate, endDate, tier (from parseFilters)
 *   - sortBy?: 'revenue' | 'deals' (default: 'revenue')
 *   - limit?:  number of reps to return (default 50)
 *
 * TODO: wire up to a leaderboardService once Prisma aggregations are implemented.
 * The real query will:
 *   1. GROUP BY salesRepId on FinancialActual and sum netRevenue
 *   2. COUNT closed Opportunity records per rep
 *   3. JOIN to User for rep details
 *   4. JOIN to Target for per-rep (or global) revenue targets
 */
leaderboardRouter.get(
  '/',
  parseFilters,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = (req as any).dashboardFilters;
      const sortBy = req.query.sortBy === 'deals' ? 'deals' : 'revenue';
      const limit = parseInt(req.query.limit as string, 10) || 50;

      // Mock data — replace with real Prisma aggregation query
      const mockData: LeaderboardRow[] = [
        {
          rank: 1,
          rep: { id: 'rep_001', name: 'Alice Johnson', email: 'alice@co.com', role: 'AE', salesRegion: 'US East', createdAt: '2023-01-10T00:00:00Z' },
          revenue: 485_000,
          target: 450_000,
          deals: 7,
        },
        {
          rank: 2,
          rep: { id: 'rep_002', name: 'Bob Martinez', email: 'bob@co.com', role: 'AE', salesRegion: 'US West', createdAt: '2023-02-15T00:00:00Z' },
          revenue: 412_000,
          target: 430_000,
          deals: 5,
        },
        {
          rank: 3,
          rep: { id: 'rep_003', name: 'Carol Smith', email: 'carol@co.com', role: 'AE', salesRegion: 'Canada', createdAt: '2023-03-01T00:00:00Z' },
          revenue: 389_000,
          target: 400_000,
          deals: 6,
        },
        {
          rank: 4,
          rep: { id: 'rep_004', name: 'David Lee', email: 'david@co.com', role: 'AE', salesRegion: 'US Central', createdAt: '2023-01-20T00:00:00Z' },
          revenue: 310_000,
          target: 380_000,
          deals: 4,
        },
      ];

      // Apply sort
      const sorted = [...mockData].sort((a, b) =>
        sortBy === 'deals' ? b.deals - a.deals : b.revenue - a.revenue,
      );

      // Re-assign ranks after sort
      const ranked = sorted.slice(0, limit).map((row, i) => ({
        ...row,
        rank: i + 1,
      }));

      res.json({ success: true, data: ranked });
    } catch (err) {
      next(err);
    }
  },
);
