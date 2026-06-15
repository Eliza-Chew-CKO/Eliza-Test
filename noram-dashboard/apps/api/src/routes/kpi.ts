import { Router, Request, Response } from 'express';

const router = Router();

// GET /kpi/summary
// Query params: dateRange (MTD|YTD), startDate, endDate, ownerId, tier
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { dateRange = 'YTD', startDate, endDate, ownerId, tier } = req.query;
    // TODO: wire to revenueService and pipelineService
    res.json({ dateRange, startDate, endDate, ownerId, tier, data: null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch KPI summary' });
  }
});

export default router;
