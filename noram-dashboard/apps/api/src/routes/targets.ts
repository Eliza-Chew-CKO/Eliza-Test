import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  const { type, year } = req.query;
  // TODO: query Targets table filtered by type and year
  res.json({ type, year, data: [] });
});

export default router;
