import { Router } from 'express';
import { parseFilters } from '../middleware/filters';
import { getWeightedPipeline, getPipelineBottlenecks, getGoLiveTracker } from '../services/pipelineService';

const router = Router();

// GET /pipeline/weighted-over-time
router.get('/weighted-over-time', parseFilters, async (req, res) => {
  try {
    const data = await getWeightedPipeline(req.dashboardFilters);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[GET /pipeline/weighted-over-time]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch weighted pipeline' });
  }
});

// GET /pipeline/bottlenecks
router.get('/bottlenecks', parseFilters, async (req, res) => {
  try {
    const data = await getPipelineBottlenecks(req.dashboardFilters);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[GET /pipeline/bottlenecks]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch pipeline bottlenecks' });
  }
});

// GET /pipeline/go-live-tracker
router.get('/go-live-tracker', parseFilters, async (req, res) => {
  try {
    const data = await getGoLiveTracker(req.dashboardFilters);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[GET /pipeline/go-live-tracker]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch go-live tracker' });
  }
});

export default router;
