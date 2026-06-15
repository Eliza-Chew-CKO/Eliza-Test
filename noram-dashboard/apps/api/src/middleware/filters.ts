import { type Request, type Response, type NextFunction } from 'express';

// Extend Express Request to carry parsed filters
declare global {
  namespace Express {
    interface Request {
      parsedFilters: ParsedFilters;
    }
  }
}

export interface ParsedFilters {
  dateRange: 'MTD' | 'YTD' | 'CUSTOM';
  startDate: Date | null;
  endDate: Date | null;
  repId: string | null;
  tier: string | null;
}

const VALID_DATE_RANGES = ['MTD', 'YTD', 'CUSTOM'] as const;
const VALID_TIERS = ['Enterprise', 'Mid-Market', 'SMB'] as const;

/**
 * Middleware that parses and validates dashboard filter query parameters.
 *
 * Supported query params:
 *   - dateRange  : 'MTD' | 'YTD' | 'CUSTOM'  (default: 'MTD')
 *   - startDate  : ISO date string             (required when dateRange=CUSTOM)
 *   - endDate    : ISO date string             (required when dateRange=CUSTOM)
 *   - repId      : string user ID              (optional)
 *   - tier       : 'Enterprise'|'Mid-Market'|'SMB' (optional)
 *
 * Attaches `req.parsedFilters` for downstream route handlers.
 */
export function parseFilters(req: Request, res: Response, next: NextFunction): void {
  const {
    dateRange = 'MTD',
    startDate: startDateStr,
    endDate: endDateStr,
    repId,
    tier,
  } = req.query as Record<string, string | undefined>;

  // Validate dateRange
  if (!VALID_DATE_RANGES.includes(dateRange as 'MTD' | 'YTD' | 'CUSTOM')) {
    res.status(400).json({
      success: false,
      error: `Invalid dateRange. Must be one of: ${VALID_DATE_RANGES.join(', ')}`,
    });
    return;
  }

  // Parse dates for CUSTOM range
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (dateRange === 'CUSTOM') {
    if (!startDateStr || !endDateStr) {
      res.status(400).json({
        success: false,
        error: 'startDate and endDate are required when dateRange is CUSTOM',
      });
      return;
    }

    startDate = new Date(startDateStr);
    endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid date format. Use ISO 8601 (e.g., 2025-01-01)',
      });
      return;
    }

    if (startDate > endDate) {
      res.status(400).json({
        success: false,
        error: 'startDate must be before or equal to endDate',
      });
      return;
    }
  }

  // Validate tier if provided
  if (tier && !VALID_TIERS.includes(tier as 'Enterprise' | 'Mid-Market' | 'SMB')) {
    res.status(400).json({
      success: false,
      error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}`,
    });
    return;
  }

  req.parsedFilters = {
    dateRange: dateRange as 'MTD' | 'YTD' | 'CUSTOM',
    startDate,
    endDate,
    repId: repId ?? null,
    tier: tier ?? null,
  };

  next();
}

/**
 * Helper: compute start and end Date objects from parsedFilters.
 * Resolves MTD/YTD into concrete date boundaries for use in Prisma queries.
 */
export function resolveDateRange(filters: ParsedFilters): { start: Date; end: Date } {
  const now = new Date();

  if (filters.dateRange === 'CUSTOM' && filters.startDate && filters.endDate) {
    return { start: filters.startDate, end: filters.endDate };
  }

  if (filters.dateRange === 'YTD') {
    return {
      start: new Date(now.getFullYear(), 0, 1), // Jan 1 of current year
      end: now,
    };
  }

  // MTD: first day of current month to now
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: now,
  };
}
