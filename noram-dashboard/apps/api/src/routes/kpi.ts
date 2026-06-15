import { Router } from 'express';
import { parseFilters } from '../middleware/filters';
import { getKPISummary } from '../services/revenueService';

const router = Router();

// GET /kpi/summary?dateRange=YTD&repName=...&tier=...
router.get('/summary', parseFilters, async (req, res) => {
  try {
    const data = await getKPISummary(req.dashboardFilters);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[GET /kpi/summary]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch KPI summary' });
  }
});

export default router;
