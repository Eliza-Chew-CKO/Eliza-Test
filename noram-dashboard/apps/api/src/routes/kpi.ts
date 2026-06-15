import { Router, Request, Response } from 'express';
import { parseFilters } from '../middleware/filters';
import { getKPISummary, getFinancialTrends } from '../services/revenueService';

const router = Router();

/**
 * GET /api/kpi/summary
 * Returns executive KPI summary: net revenue, frontbook MNR, backbook revenue, TPV, go-live count, VAMP avg.
 *
 * Query params:
 *   dateRange  — 'MTD' | 'YTD' | 'CUSTOM'
 *   startDate  — ISO date string (when dateRange === 'CUSTOM')
 *   endDate    — ISO date string (when dateRange === 'CUSTOM')
 *   repId      — filter by sales rep ID
 *   tier       — filter by account tier (Enterprise | Mid-Market | SMB)
 */
router.get('/summary', parseFilters, async (req: Request, res: Response) => {
  try {
    // TODO: wire to revenueService.getKPISummary once Prisma DB is connected
    const summary = await getKPISummary(req.filters);
    res.json({ success: true, data: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch KPI summary';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/kpi/trends
 * Returns monthly revenue actuals vs targets for trend charts.
 * Shape: { month: string, actual: number, target: number }[]
 */
router.get('/trends', parseFilters, async (req: Request, res: Response) => {
  try {
    // TODO: wire to revenueService.getFinancialTrends
    const trends = await getFinancialTrends(req.filters);
    res.json({ success: true, data: trends });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch trend data';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
