import { Router } from 'express';

const router = Router();

router.get('/rep-mr', async (_req, res) => {
  // TODO: aggregate FinancialActuals by salesRepId, rank by netRevenue YTD
  res.json({ data: [] });
});

router.get('/activity/:stage', async (req, res) => {
  const { stage } = req.params;
  // TODO: count Opportunity stage movements per rep for the given stage
  res.json({ stage, data: [] });
});

export default router;
