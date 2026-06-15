import { Router, type Request, type Response } from 'express';
import { parseFilters } from '../middleware/filters';
// TODO: wire these stubs to real Prisma queries once the DB is seeded
import { getKPISummary, getFinancialTrends } from '../services/revenueService';

const router = Router();

/**
 * GET /api/kpi/summary
 *
 * Returns a KPISummary object for the requested period and optional rep / tier filters.
 *
 * Query params:
 *   - dateRange: 'MTD' | 'YTD' | 'CUSTOM'
 *   - startDate?: ISO date string (required when dateRange === 'CUSTOM')
 *   - endDate?:   ISO date string (required when dateRange === 'CUSTOM')
 *   - repId?:     string — filter to a single sales rep
 *   - tier?:      'Enterprise' | 'Mid-Market' | 'SMB'
 */
router.get('/summary', parseFilters, async (req: Request, res: Response) => {
  try {
    const filters = (req as any).filters;
    // TODO: replace mock with: const data = await getKPISummary(filters);
    const data = await getKPISummary(filters);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/kpi/trends
 *
 * Returns monthly revenue actuals vs targets for charting.
 * Shape: { month: 'Jan 2025', actual: number, target: number, tpv: number }[]
 */
router.get('/trends', parseFilters, async (req: Request, res: Response) => {
  try {
    const filters = (req as any).filters;
    // TODO: replace mock with real FinancialActual + Target aggregation
    const data = await getFinancialTrends(filters);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
