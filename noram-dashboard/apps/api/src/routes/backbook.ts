import { Router, type Request, type Response } from 'express';
import { parseFilters } from '../middleware/filters';
// TODO: import { getAccounts, getBackbookSummary } from '../services/backbookService';

const router = Router();

const MOCK_ACCOUNTS = Array.from({ length: 25 }, (_, i) => ({
  id: `acc_${i + 1}`,
  alias: `Account ${String.fromCharCode(65 + (i % 26))}${i + 1}`,
  tier: ['Enterprise', 'Mid-Market', 'SMB'][i % 3],
  isManaged: i % 3 !== 2,
  salesRepId: `rep_${(i % 4) + 1}`,
  accountManagerId: i % 3 !== 2 ? `am_${(i % 2) + 1}` : null,
  goLiveDate: new Date(2024, i % 12, 1).toISOString(),
  region: ['US-East', 'US-West', 'US-Central', 'Canada'][i % 4],
  referralPartner: i % 4 === 0 ? `Partner ${i}` : null,
  sector: ['FinTech', 'eCommerce', 'SaaS', 'Retail'][i % 4],
  createdAt: new Date(2023, i % 12, 1).toISOString(),
  // Computed financial fields
  netRevenueMTD: 20_000 + i * 8_000,
  tpvAmount: 1_500_000 + i * 500_000,
  vampRatio: i % 7 === 0 ? 0.0089 : 0.0015 + (i * 0.0001),
}));

/**
 * GET /api/backbook
 * Returns accounts with their latest financial actuals.
 *
 * Query params: tier, repId, region, dateRange
 */
router.get('/', parseFilters, (req: Request, res: Response) => {
  const { tier, repId, region } = req.query;
  // TODO: replace with backbookService.getAccounts(req.parsedFilters)

  let results = [...MOCK_ACCOUNTS];

  if (typeof tier === 'string' && tier) {
    results = results.filter((a) => a.tier === tier);
  }
  if (typeof repId === 'string' && repId) {
    results = results.filter((a) => a.salesRepId === repId);
  }
  if (typeof region === 'string' && region) {
    results = results.filter((a) => a.region === region);
  }

  res.json({ success: true, data: results });
});

/**
 * GET /api/backbook/summary
 * Returns managed vs unmanaged revenue breakdown.
 */
router.get('/summary', parseFilters, (_req: Request, res: Response) => {
  // TODO: replace with backbookService.getBackbookSummary(req.parsedFilters)

  const managed = MOCK_ACCOUNTS.filter((a) => a.isManaged);
  const unmanaged = MOCK_ACCOUNTS.filter((a) => !a.isManaged);

  const summary = {
    managed: {
      count: managed.length,
      netRevenue: managed.reduce((s, a) => s + a.netRevenueMTD, 0),
      tpv: managed.reduce((s, a) => s + a.tpvAmount, 0),
    },
    unmanaged: {
      count: unmanaged.length,
      netRevenue: unmanaged.reduce((s, a) => s + a.netRevenueMTD, 0),
      tpv: unmanaged.reduce((s, a) => s + a.tpvAmount, 0),
    },
  };

  res.json({ success: true, data: summary });
});

export default router;
