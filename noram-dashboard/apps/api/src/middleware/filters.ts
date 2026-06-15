import type { Request, Response, NextFunction } from 'express';

// ─── Extend Express Request to carry parsed filters ───────────────────────────

export interface ParsedFilters {
  dateRange: 'MTD' | 'YTD' | 'CUSTOM';
  startDate?: Date;
  endDate?: Date;
  repId?: string;
  tier?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      parsedFilters: ParsedFilters;
    }
  }
}

const VALID_DATE_RANGES = new Set<string>(['MTD', 'YTD', 'CUSTOM']);
const VALID_TIERS = new Set<string>(['Enterprise', 'Mid-Market', 'SMB']);

function isValidDateRange(value: string): value is ParsedFilters['dateRange'] {
  return VALID_DATE_RANGES.has(value);
}

/**
 * parseFilters middleware
 *
 * Extracts and validates standard dashboard filter query params from every
 * request. Attaches a typed `req.parsedFilters` object for use in route
 * handlers and service calls.
 *
 * Query params accepted:
 *   dateRange   'MTD' | 'YTD' | 'CUSTOM'   — defaults to 'MTD'
 *   startDate   ISO date string             — required when dateRange='CUSTOM'
 *   endDate     ISO date string             — required when dateRange='CUSTOM'
 *   repId       string                      — sales rep ID
 *   tier        'Enterprise'|'Mid-Market'|'SMB'
 *
 * Responds 400 if:
 *   - dateRange value is not one of the valid enum values
 *   - dateRange='CUSTOM' but startDate/endDate are missing or invalid
 *   - tier value is not one of the valid enum values
 */
export function parseFilters(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { dateRange, startDate, endDate, repId, tier } = req.query;

  // --- dateRange validation ---
  const rawDateRange = typeof dateRange === 'string' ? dateRange : 'MTD';
  if (!isValidDateRange(rawDateRange)) {
    res.status(400).json({
      success: false,
      error: `Invalid dateRange "${rawDateRange}". Must be one of: MTD, YTD, CUSTOM.`,
    });
    return;
  }

  // --- Custom date range validation ---
  let parsedStart: Date | undefined;
  let parsedEnd: Date | undefined;

  if (rawDateRange === 'CUSTOM') {
    if (typeof startDate !== 'string' || typeof endDate !== 'string') {
      res.status(400).json({
        success: false,
        error: 'startDate and endDate are required when dateRange is CUSTOM.',
      });
      return;
    }

    parsedStart = new Date(startDate);
    parsedEnd = new Date(endDate);

    if (isNaN(parsedStart.getTime())) {
      res.status(400).json({ success: false, error: `Invalid startDate: "${startDate}"` });
      return;
    }
    if (isNaN(parsedEnd.getTime())) {
      res.status(400).json({ success: false, error: `Invalid endDate: "${endDate}"` });
      return;
    }
    if (parsedStart > parsedEnd) {
      res.status(400).json({ success: false, error: 'startDate must be before endDate.' });
      return;
    }
  }

  // --- Tier validation ---
  const rawTier = typeof tier === 'string' ? tier : undefined;
  if (rawTier && !VALID_TIERS.has(rawTier)) {
    res.status(400).json({
      success: false,
      error: `Invalid tier "${rawTier}". Must be one of: Enterprise, Mid-Market, SMB.`,
    });
    return;
  }

  // --- Attach parsed filters to request ---
  req.parsedFilters = {
    dateRange: rawDateRange,
    startDate: parsedStart,
    endDate: parsedEnd,
    repId: typeof repId === 'string' && repId ? repId : undefined,
    tier: rawTier,
  };

  next();
}
