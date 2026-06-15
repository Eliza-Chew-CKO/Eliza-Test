import { Router, type Request, type Response, type NextFunction } from 'express';
import { parseFilters } from '../middleware/filters';
import { getAccounts, getBackbookSummary } from '../services/backbookService';

export const backbookRouter = Router();

/**
 * GET /api/backbook
 *
 * Returns accounts joined with their latest financial actuals (net revenue, TPV, VAMP ratio).
 * Used by the Backbook Accounts section table.
 *
 * Query params:
 *   - dateRange, startDate, endDate, repId, tier (from parseFilters)
 *   - region?: filter by account region
 *   - managed?: 'true' | 'false' — filter managed/unmanaged only
 */
backbookRouter.get(
  '/',
  parseFilters,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = (req as any).dashboardFilters;

      // Backbook-specific filters
      const region = typeof req.query.region === 'string' ? req.query.region : undefined;
      const managed = req.query.managed === 'true'
        ? true
        : req.query.managed === 'false'
        ? false
        : undefined;

      // TODO: pass region and managed to getAccounts once Prisma is wired
      const accounts = await getAccounts({ ...filters, region, managed });

      res.json({ success: true, data: accounts });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/backbook/summary
 *
 * Returns a high-level breakdown of managed vs unmanaged account revenue.
 * Used for the KPI cards at the top of the Backbook section.
 *
 * Query params: same as GET /api/backbook
 */
backbookRouter.get(
  '/summary',
  parseFilters,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = (req as any).dashboardFilters;
      const summary = await getBackbookSummary(filters);
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  },
);
