import type { Request, Response, NextFunction } from 'express';

// ─── Extend Express Request to carry parsed filters ───────────────────────────

declare global {
  namespace Express {
    interface Request {
      dashboardFilters: DashboardFilters;
    }
  }
}

export type DateRange = 'MTD' | 'YTD' | 'CUSTOM';

export interface DashboardFilters {
  dateRange: DateRange;
  startDate?: Date;
  endDate?: Date;
  repId?: string;
  tier?: string;
}

const VALID_DATE_RANGES: DateRange[] = ['MTD', 'YTD', 'CUSTOM'];
const VALID_TIERS = ['Enterprise', 'Mid-Market', 'SMB'];

/**
 * Parses and validates dashboard filter query params from the request URL.
 * Attaches a typed `DashboardFilters` object to `req.dashboardFilters`.
 *
 * Validation rules:
 * - dateRange must be one of: MTD | YTD | CUSTOM (defaults to MTD if omitted)
 * - When dateRange = CUSTOM, startDate and endDate must be valid ISO date strings
 * - tier must be one of: Enterprise | Mid-Market | SMB (ignored if unknown value provided)
 * - repId is passed through as a string without validation (looked up against DB at query time)
 *
 * Usage:
 *   router.get('/my-route', parseFilters, async (req, res) => {
 *     const filters = req.dashboardFilters;
 *   });
 */
export function parseFilters(req: Request, res: Response, next: NextFunction): void {
  const rawDateRange = req.query.dateRange as string | undefined;
  const rawStartDate = req.query.startDate as string | undefined;
  const rawEndDate   = req.query.endDate   as string | undefined;
  const rawRepId     = req.query.repId     as string | undefined;
  const rawTier      = req.query.tier      as string | undefined;

  // Validate dateRange
  const dateRange: DateRange =
    rawDateRange && VALID_DATE_RANGES.includes(rawDateRange as DateRange)
      ? (rawDateRange as DateRange)
      : 'MTD';

  // Validate custom date range
  if (dateRange === 'CUSTOM') {
    if (!rawStartDate || !rawEndDate) {
      res.status(400).json({
        success: false,
        error: 'startDate and endDate are required when dateRange is CUSTOM',
      });
      return;
    }
    const start = new Date(rawStartDate);
    const end   = new Date(rawEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({
        success: false,
        error: 'startDate and endDate must be valid ISO date strings',
      });
      return;
    }
    if (start > end) {
      res.status(400).json({
        success: false,
        error: 'startDate must be before or equal to endDate',
      });
      return;
    }
    req.dashboardFilters = {
      dateRange,
      startDate: start,
      endDate:   end,
      repId:     rawRepId || undefined,
      tier:      rawTier && VALID_TIERS.includes(rawTier) ? rawTier : undefined,
    };
    next();
    return;
  }

  // MTD / YTD — compute date bounds server-side
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (dateRange === 'YTD') {
    startDate = new Date(now.getFullYear(), 0, 1); // 1 Jan current year
    endDate   = now;
  } else {
    // MTD
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate   = now;
  }

  req.dashboardFilters = {
    dateRange,
    startDate,
    endDate,
    repId: rawRepId || undefined,
    tier:  rawTier && VALID_TIERS.includes(rawTier) ? rawTier : undefined,
  };

  next();
}
