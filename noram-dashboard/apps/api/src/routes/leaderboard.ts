import { Router } from 'express';
import { parseFilters } from '../middleware/filters';
import { getRepMRLeaderboard, getActivityLeaderboard } from '../services/leaderboardService';

const router = Router();

// GET /leaderboard/rep-mr
router.get('/rep-mr', parseFilters, async (req, res) => {
  try {
    const data = await getRepMRLeaderboard(req.dashboardFilters);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[GET /leaderboard/rep-mr]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch rep MR leaderboard' });
  }
});

// GET /leaderboard/activity/:stage  (explore | propose | trade | handover)
router.get('/activity/:stage', parseFilters, async (req, res) => {
  const stage = req.params.stage as any;
  const validStages = ['explore', 'propose', 'trade', 'handover'];
  if (!validStages.includes(stage)) {
    res.status(400).json({ success: false, error: `stage must be one of: ${validStages.join(', ')}` });
    return;
  }
  try {
    const data = await getActivityLeaderboard(stage, req.dashboardFilters);
    res.json({ success: true, data });
  } catch (err) {
    console.error(`[GET /leaderboard/activity/${stage}]`, err);
    res.status(500).json({ success: false, error: 'Failed to fetch activity leaderboard' });
  }
});

export default router;
