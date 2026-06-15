import { Router, type Request, type Response, type NextFunction } from 'express';
import { parseFilters } from '../middleware/filters';
import { getKPISummary, getFinancialTrends } from '../services/revenueService';

export const kpiRouter = Router();

/**
 * GET /api/kpi/summary
 *
 * Returns the top-level KPI summary for the Executive Summary section.
 *
 * Query params (parsed by parseFilters middleware):
 *   - dateRange: 'MTD' | 'YTD' | 'CUSTOM'
 *   - startDate?: ISO date string (required when dateRange = CUSTOM)
 *   - endDate?:   ISO date string (required when dateRange = CUSTOM)
 *   - repId?:     string — filter to a single sales rep
 *   - tier?:      'Enterprise' | 'Mid-Market' | 'SMB'
 *
 * Response shape matches the KPISummary interface from @noram/web/src/types.
 */
kpiRouter.get(
  '/summary',
  parseFilters,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: wire to revenueService.getKPISummary once Prisma models are ready
      const filters = (req as any).dashboardFilters;
      const summary = await getKPISummary(filters);

      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/kpi/trends
 *
 * Returns month-by-month revenue actuals vs targets for the Financial Trends charts.
 * Also includes TPV per month.
 *
 * Same query params as /summary.
 */
kpiRouter.get(
  '/trends',
  parseFilters,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: wire to revenueService.getFinancialTrends once Prisma models are ready
      const filters = (req as any).dashboardFilters;
      const trends = await getFinancialTrends(filters);

      res.json({ success: true, data: trends });
    } catch (err) {
      next(err);
    }
  },
);
