import { Router, type Request, type Response } from 'express';
import { parseFilters } from '../middleware/filters';
// TODO: import { getAccounts, getBackbookSummary } from '../services/backbookService';

const router = Router();

/**
 * GET /api/backbook
 *
 * Returns live accounts with their latest financial actuals and VAMP scores.
 * Query params:
 *   - dateRange, startDate, endDate, repId (standard filters)
 *   - tier?:    'Enterprise' | 'Mid-Market' | 'SMB'
 *   - region?:  region string
 *   - managed?: 'true' | 'false'
 */
router.get('/', parseFilters, async (req: Request, res: Response) => {
  try {
    const { managed, region } = req.query as Record<string, string>;

    // TODO: const accounts = await getAccounts({ ...req.filters, managed, region });

    const tiers = ['Enterprise', 'Mid-Market', 'SMB'] as const;
    const regions = ['US-West', 'US-East', 'Canada', 'LATAM'];
    const sectors = ['FinTech', 'eCommerce', 'Retail', 'Travel', 'SaaS'];

    const mockAccounts = Array.from({ length: 20 }, (_, i) => ({
      id:               `account-${i + 1}`,
      alias:            `Account ${String.fromCharCode(65 + (i % 26))}${i + 1}`,
      tier:             tiers[i % 3],
      isManaged:        i % 3 !== 2,
      salesRepId:       `rep-${(i % 4) + 1}`,
      accountManagerId: i % 3 !== 2 ? `am-${(i % 2) + 1}` : null,
      goLiveDate:       new Date(Date.now() - (i + 1) * 45 * 86400000).toISOString(),
      region:           regions[i % 4],
      referralPartner:  i % 5 === 0 ? 'Partner Corp' : null,
      sector:           sectors[i % 5],
      createdAt:        new Date().toISOString(),
    })).filter((a) => {
      if (managed === 'true'  && !a.isManaged) return false;
      if (managed === 'false' && a.isManaged)  return false;
      if (region && a.region !== region)        return false;
      return true;
    });

    res.json({ success: true, data: mockAccounts });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error });
  }
});

/**
 * GET /api/backbook/summary
 *
 * Returns aggregated managed vs unmanaged revenue breakdown.
 */
router.get('/summary', parseFilters, async (_req: Request, res: Response) => {
  try {
    // TODO: const summary = await getBackbookSummary(req.filters);
    const summary = {
      managed: {
        accountCount:  14,
        netRevenueMTD: 310_000,
        target:        285_000,
      },
      unmanaged: {
        accountCount:   6,
        netRevenueMTD:  95_000,
        target:        100_000,
      },
      total: {
        accountCount:  20,
        netRevenueMTD: 405_000,
        target:        385_000,
      },
    };

    res.json({ success: true, data: summary });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error });
  }
});

export default router;
