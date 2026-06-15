import type { Request, Response, NextFunction } from 'express';

export type DateRange = 'MTD' | 'YTD' | 'CUSTOM';

export interface DashboardFilters {
  dateRange: DateRange;
  startDate?: string;
  endDate?: string;
  repId?: string;
  tier?: string;
}

// Extend Express Request type to carry parsed filters
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      parsedFilters: DashboardFilters;
    }
  }
}

const VALID_DATE_RANGES: DateRange[] = ['MTD', 'YTD', 'CUSTOM'];
const VALID_TIERS = ['Enterprise', 'Mid-Market', 'SMB'];

/**
 * parseFilters middleware
 *
 * Extracts and validates dashboard filter query parameters from req.query,
 * then attaches the parsed DashboardFilters object to req.parsedFilters.
 *
 * Validated params:
 *   dateRange  — must be 'MTD' | 'YTD' | 'CUSTOM'  (default: 'MTD')
 *   startDate  — ISO date string, required when dateRange='CUSTOM'
 *   endDate    — ISO date string, required when dateRange='CUSTOM'
 *   repId      — free-form string ID
 *   tier       — must be 'Enterprise' | 'Mid-Market' | 'SMB'
 *
 * Returns 400 if:
 *   - dateRange is present but not in the valid enum
 *   - dateRange='CUSTOM' but startDate or endDate is missing / invalid
 *   - tier is present but not in the valid enum
 */
export function parseFilters(req: Request, res: Response, next: NextFunction): void {
  const { dateRange, startDate, endDate, repId, tier } = req.query as Record<string, string | undefined>;

  // ── Validate dateRange ──────────────────────────────────────────────────────
  const parsedDateRange: DateRange = (dateRange as DateRange) ?? 'MTD';

  if (!VALID_DATE_RANGES.includes(parsedDateRange)) {
    res.status(400).json({
      success: false,
      error: `Invalid dateRange "${dateRange}". Must be one of: ${VALID_DATE_RANGES.join(', ')}`,
    });
    return;
  }

  // ── Validate custom date range ────────────────────────────────────────────────
  if (parsedDateRange === 'CUSTOM') {
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
  }

  // ── Validate tier ─────────────────────────────────────────────────────────────
  if (tier && !VALID_TIERS.includes(tier)) {
    res.status(400).json({
      success: false,
      error: `Invalid tier "${tier}". Must be one of: ${VALID_TIERS.join(', ')}`,
    });
    return;
  }

  // ── Attach to request ─────────────────────────────────────────────────────────
  req.parsedFilters = {
    dateRange: parsedDateRange,
    startDate: parsedDateRange === 'CUSTOM' ? startDate : undefined,
    endDate:   parsedDateRange === 'CUSTOM' ? endDate   : undefined,
    repId:     repId || undefined,
    tier:      tier  || undefined,
  };

  next();
}
