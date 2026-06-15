import { Router } from 'express';

const router = Router();

router.get('/managed', async (_req, res) => {
  // TODO: filter Accounts where isManaged=true and backbook region=NORAM, join FinancialActuals
  res.json({ data: [] });
});

router.get('/unmanaged', async (_req, res) => {
  // TODO: filter Accounts where isManaged=false and backbook region=NORAM
  res.json({ data: [] });
});

router.get('/vamp-trend', async (_req, res) => {
  // TODO: aggregate VampRecords by month, compute average vampRatio
  res.json({ data: [] });
});

router.get('/excessive-vamp', async (_req, res) => {
  // TODO: filter VampRecords where vampType=EXCESSIVE
  res.json({ data: [] });
});

export default router;
