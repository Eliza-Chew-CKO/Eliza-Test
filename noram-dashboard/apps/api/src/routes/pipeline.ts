import { Router, type Request, type Response, type NextFunction } from 'express';
import { parseFilters } from '../middleware/filters';
import { getOpportunities, getPipelineFunnel } from '../services/pipelineService';

export const pipelineRouter = Router();

/**
 * GET /api/pipeline
 *
 * Returns a paginated list of open pipeline opportunities.
 *
 * Query params:
 *   - dateRange, startDate, endDate, repId, tier (parsed by parseFilters)
 *   - stage?: filter to a specific pipeline stage
 *   - page?:  page number (default 1)
 *   - limit?: page size (default 50)
 */
pipelineRouter.get(
  '/',
  parseFilters,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = (req as any).dashboardFilters;

      // Additional pipeline-specific filters
      const stage = typeof req.query.stage === 'string' ? req.query.stage : undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;

      // TODO: pass stage, page, limit to pipelineService once Prisma is wired up
      const opportunities = await getOpportunities({ ...filters, stage });

      // Paginate the result
      const total = opportunities.length;
      const paginated = opportunities.slice((page - 1) * limit, page * limit);

      res.json({
        success: true,
        data: paginated,
        meta: {
          total,
          page,
          limit,
          pageCount: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/pipeline/funnel
 *
 * Returns aggregated counts and weighted MNR values by stage for the funnel chart.
 */
pipelineRouter.get(
  '/funnel',
  parseFilters,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = (req as any).dashboardFilters;
      const funnel = await getPipelineFunnel(filters);
      res.json({ success: true, data: funnel });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/pipeline/:id
 *
 * Returns a single opportunity by ID with full detail (including stageHistory).
 */
pipelineRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      // TODO: query Prisma for single opportunity
      // const opportunity = await prisma.opportunity.findUniqueOrThrow({ where: { id } });
      res.json({
        success: true,
        data: {
          id,
          message: 'TODO: return single opportunity from Prisma',
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
