import { Router } from 'express';
import { parseFilters } from '../middleware/filters';
import { getFrontbookTrend, getBackbookTrend, getTPVByMonth } from '../services/revenueService';

const router = Router();

// GET /financials/frontbook-trend
router.get('/frontbook-trend', parseFilters, async (req, res) => {
  try {
    const data = await getFrontbookTrend(req.dashboardFilters);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[GET /financials/frontbook-trend]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch frontbook trend' });
  }
});

// GET /financials/backbook-trend
router.get('/backbook-trend', parseFilters, async (req, res) => {
  try {
    const data = await getBackbookTrend(req.dashboardFilters);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[GET /financials/backbook-trend]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch backbook trend' });
  }
});

// GET /financials/tpv-by-month
router.get('/tpv-by-month', parseFilters, async (req, res) => {
  try {
    const data = await getTPVByMonth(req.dashboardFilters);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[GET /financials/tpv-by-month]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch TPV by month' });
  }
});

export default router;
