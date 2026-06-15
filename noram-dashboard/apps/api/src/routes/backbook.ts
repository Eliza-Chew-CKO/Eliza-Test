import { Router } from 'express';
import { parseFilters } from '../middleware/filters';
import { getManagedAccounts, getUnmanagedAccounts, getExcessiveVamp, getVampTrend } from '../services/backbookService';

const router = Router();

// GET /backbook/managed
router.get('/managed', parseFilters, async (req, res) => {
  try {
    const data = await getManagedAccounts(req.dashboardFilters);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[GET /backbook/managed]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch managed accounts' });
  }
});

// GET /backbook/unmanaged
router.get('/unmanaged', parseFilters, async (req, res) => {
  try {
    const data = await getUnmanagedAccounts(req.dashboardFilters);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[GET /backbook/unmanaged]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch unmanaged accounts' });
  }
});

// GET /backbook/excessive-vamp
router.get('/excessive-vamp', parseFilters, async (req, res) => {
  try {
    const data = await getExcessiveVamp(req.dashboardFilters);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[GET /backbook/excessive-vamp]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch excessive VAMP records' });
  }
});

// GET /backbook/vamp-trend
router.get('/vamp-trend', parseFilters, async (req, res) => {
  try {
    const data = await getVampTrend(req.dashboardFilters);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[GET /backbook/vamp-trend]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch VAMP trend' });
  }
});

export default router;
