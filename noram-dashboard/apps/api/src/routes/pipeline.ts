import { Router } from 'express';

const router = Router();

router.get('/weighted-over-time', async (_req, res) => {
  // TODO: query Opportunity table, group by month and stage, sum weightedExpectedMNR
  res.json({ data: [] });
});

router.get('/closed-won', async (_req, res) => {
  // TODO: query Opportunities where stage = CLOSED_WON, join Account + FinancialActuals
  res.json({ data: [] });
});

router.get('/bottlenecks', async (_req, res) => {
  // TODO: count opportunities by stage movement in last 90 vs prior 90 days
  res.json({ data: [] });
});

router.get('/changes', async (_req, res) => {
  // TODO: diff stageHistory JSON to find upgrades/downgrades in last month
  res.json({ data: [] });
});

export default router;
