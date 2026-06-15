import { Router, type Request, type Response } from 'express';
import { parseFilters } from '../middleware/filters';
// TODO: import { getLeaderboard } from '../services/revenueService';

const router = Router();

/**
 * GET /api/leaderboard
 *
 * Returns a ranked list of sales reps with their revenue actuals, deal counts,
 * and performance vs target for the selected period.
 *
 * Query params:
 *   - dateRange: 'MTD' | 'YTD' | 'CUSTOM' (standard dashboard filter)
 *   - tier?:     filter leaderboard to accounts of a specific tier
 */
router.get('/', parseFilters, async (_req: Request, res: Response) => {
  try {
    // TODO: const leaderboard = await getLeaderboard(req.filters);

    const mockReps = [
      { id: 'rep-1', name: 'Alex Johnson',   email: 'alex.johnson@company.com',   role: 'AE', salesRegion: 'US-West',  createdAt: new Date().toISOString() },
      { id: 'rep-2', name: 'Maria Garcia',   email: 'maria.garcia@company.com',   role: 'AE', salesRegion: 'US-East',  createdAt: new Date().toISOString() },
      { id: 'rep-3', name: 'James Chen',     email: 'james.chen@company.com',     role: 'AE', salesRegion: 'Canada',   createdAt: new Date().toISOString() },
      { id: 'rep-4', name: 'Sarah Williams', email: 'sarah.williams@company.com', role: 'AE', salesRegion: 'US-East',  createdAt: new Date().toISOString() },
      { id: 'rep-5', name: 'David Kim',      email: 'david.kim@company.com',      role: 'AE', salesRegion: 'US-West',  createdAt: new Date().toISOString() },
    ];

    const leaderboard = mockReps
      .map((rep, i) => ({
        rep,
        revenue: 120_000 - i * 15_000 + Math.round(Math.random() * 5_000),
        target:  100_000,
        deals:   8 - i,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json({ success: true, data: leaderboard });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error });
  }
});

export default router;
