import { Router, type Request, type Response } from 'express';
import { parseFilters } from '../middleware/filters';
// TODO: import { getLeaderboard } from '../services/revenueService';

const router = Router();

const MOCK_REPS = [
  { id: 'rep_1', name: 'Alice Johnson',  email: 'alice@checkout.com',  role: 'AE', salesRegion: 'US-East',    createdAt: '2022-01-10T00:00:00Z' },
  { id: 'rep_2', name: 'Bob Martinez',   email: 'bob@checkout.com',    role: 'AE', salesRegion: 'US-West',    createdAt: '2021-06-15T00:00:00Z' },
  { id: 'rep_3', name: 'Carol Lee',      email: 'carol@checkout.com',  role: 'AE', salesRegion: 'Canada',     createdAt: '2023-03-01T00:00:00Z' },
  { id: 'rep_4', name: 'David Kim',      email: 'david@checkout.com',  role: 'AE', salesRegion: 'US-Central', createdAt: '2022-09-20T00:00:00Z' },
];

const MOCK_LEADERBOARD = MOCK_REPS.map((rep, i) => ({
  rank: i + 1,
  rep,
  revenue: 280_000 - i * 35_000,
  target: 300_000,
  deals: 8 - i,
}));

/**
 * GET /api/leaderboard
 * Returns ranked list of reps with revenue attainment and deals closed.
 *
 * Query params: dateRange, tier, repId
 */
router.get('/', parseFilters, (_req: Request, res: Response) => {
  // TODO: const filters = req.parsedFilters;
  // TODO: const leaderboard = await getLeaderboard(filters);

  // Sort by revenue descending and re-rank
  const sorted = [...MOCK_LEADERBOARD]
    .sort((a, b) => b.revenue - a.revenue)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  res.json({ success: true, data: sorted });
});

export default router;
