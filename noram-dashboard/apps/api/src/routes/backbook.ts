import { Router, Request, Response } from 'express';
import { parseFilters } from '../middleware/filters';
import { getAccounts, getBackbookSummary } from '../services/backbookService';

const router = Router();

/**
 * GET /api/backbook
 * Returns accounts with their latest FinancialActual and most recent VampRecord.
 *
 * Query params:
 *   tier    — Enterprise | Mid-Market | SMB
 *   repId   — filter by sales rep ID
 *   region  — filter by account region
 *   managed — 'true' | 'false' to filter managed/unmanaged accounts
 */
router.get('/', parseFilters, async (req: Request, res: Response) => {
  try {
    const { managed, region } = req.query;
    const managedFilter =
      managed === 'true' ? true : managed === 'false' ? false : undefined;
    const regionFilter = typeof region === 'string' ? region : undefined;

    const accounts = await getAccounts({
      ...req.filters,
      isManaged: managedFilter,
      region: regionFilter,
    });

    res.json({ success: true, data: accounts });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch backbook accounts';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/backbook/summary
 * Returns managed vs unmanaged revenue breakdown, total backbook MNR, and target variance.
 */
router.get('/summary', parseFilters, async (req: Request, res: Response) => {
  try {
    const summary = await getBackbookSummary(req.filters);
    res.json({ success: true, data: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch backbook summary';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
