import { type Request, type Response, type NextFunction } from 'express';

export type DateRange = 'MTD' | 'YTD' | 'CUSTOM';

export interface ParsedFilters {
  dateRange: DateRange;
  startDate?: Date;
  endDate?: Date;
  repId?: string;
  tier?: string;
}

// Extend Express Request to carry parsed filters
declare global {
  namespace Express {
    interface Request {
      filters: ParsedFilters;
    }
  }
}

const VALID_DATE_RANGES: DateRange[] = ['MTD', 'YTD', 'CUSTOM'];

/**
 * parseFilters middleware
 *
 * Parses and validates standard dashboard filter query params, then attaches
 * them to req.filters for use in downstream route handlers and service calls.
 *
 * Validated params:
 *   - dateRange: must be one of MTD | YTD | CUSTOM (defaults to MTD)
 *   - startDate: ISO date string, required when dateRange=CUSTOM
 *   - endDate:   ISO date string, required when dateRange=CUSTOM
 *   - repId:     optional string
 *   - tier:      optional, must be Enterprise | Mid-Market | SMB if provided
 */
export function parseFilters(req: Request, res: Response, next: NextFunction): void {
  const { dateRange, startDate, endDate, repId, tier } = req.query as Record<string, string>;

  // Validate dateRange
  const parsedRange: DateRange =
    VALID_DATE_RANGES.includes(dateRange as DateRange)
      ? (dateRange as DateRange)
      : 'MTD';

  // Validate CUSTOM date range requirements
  if (parsedRange === 'CUSTOM') {
    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'startDate and endDate are required when dateRange is CUSTOM',
      });
      return;
    }

    const start = new Date(startDate);
    const end   = new Date(endDate);

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

    req.filters = { dateRange: parsedRange, startDate: start, endDate: end, repId, tier };
    next();
    return;
  }

  // Validate tier if provided
  const validTiers = ['Enterprise', 'Mid-Market', 'SMB'];
  if (tier && !validTiers.includes(tier)) {
    res.status(400).json({
      success: false,
      error: `tier must be one of: ${validTiers.join(', ')}`,
    });
    return;
  }

  req.filters = {
    dateRange: parsedRange,
    repId:     repId   || undefined,
    tier:      tier    || undefined,
  };

  next();
}
