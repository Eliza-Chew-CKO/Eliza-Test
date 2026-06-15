import { Router, type Request, type Response } from 'express';
import { parseFilters } from '../middleware/filters';
import { getOpportunities, getPipelineFunnel } from '../services/pipelineService';

const router = Router();

/**
 * GET /api/pipeline
 *
 * Returns a paginated list of open Opportunities, with optional filters.
 *
 * Query params:
 *   - dateRange, repId, tier (via parseFilters middleware)
 *   - stage?: filter to a specific pipeline stage
 *   - page?:  page number (default 1)
 *   - limit?: page size (default 20)
 */
router.get('/', parseFilters, async (req: Request, res: Response) => {
  try {
    const filters = (req as any).filters;
    const stage = req.query.stage as string | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    // TODO: pass stage + pagination into pipelineService.getOpportunities
    const data = await getOpportunities({ ...filters, stage });
    const paginated = data.slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      data: paginated,
      meta: { total: data.length, page, limit, pages: Math.ceil(data.length / limit) },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/pipeline/funnel
 *
 * Returns stage-level aggregate data for the pipeline funnel chart.
 * Shape: { stage: string, count: number, value: number }[]
 */
router.get('/funnel', parseFilters, async (req: Request, res: Response) => {
  try {
    const filters = (req as any).filters;
    const data = await getPipelineFunnel(filters);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/pipeline/:id
 *
 * Returns a single Opportunity by ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const all = await getOpportunities({});
    const opp = all.find((o: any) => o.id === id);
    if (!opp) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }
    res.json({ success: true, data: opp });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
