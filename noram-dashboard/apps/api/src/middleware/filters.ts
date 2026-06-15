import type { Request, Response, NextFunction } from 'express';

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
  startDate: Date;
  endDate: Date;
  repName?: string;   // match against salesRepName strings in DB
  tier?: string;      // TIER_1 | TIER_2 | TIER_3
}

const VALID_DATE_RANGES: DateRange[] = ['MTD', 'YTD', 'CUSTOM'];

/** First day of a given month (UTC). */
export function monthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** First day of n months before d. */
export function subMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - n, 1));
}

/** Last completed month start (UTC). */
export function lastCompletedMonthStart(): Date {
  return subMonths(new Date(), 1);
}

/** Resolve startDate/endDate from a DateRange string. */
export function resolveDateRange(range: DateRange, start?: Date, end?: Date): { startDate: Date; endDate: Date } {
  const now = new Date();
  if (range === 'CUSTOM' && start && end) return { startDate: start, endDate: end };
  if (range === 'MTD') return { startDate: monthStart(now), endDate: now };
  // YTD default
  return {
    startDate: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
    endDate: now,
  };
}

export function parseFilters(req: Request, res: Response, next: NextFunction): void {
  const rawDateRange = req.query.dateRange as string | undefined;
  const rawStartDate = req.query.startDate as string | undefined;
  const rawEndDate   = req.query.endDate   as string | undefined;
  const rawRepName   = req.query.repName   as string | undefined;
  const rawTier      = req.query.tier      as string | undefined;

  const dateRange: DateRange =
    rawDateRange && VALID_DATE_RANGES.includes(rawDateRange as DateRange)
      ? (rawDateRange as DateRange)
      : 'YTD';

  if (dateRange === 'CUSTOM') {
    if (!rawStartDate || !rawEndDate) {
      res.status(400).json({ error: 'startDate and endDate required for CUSTOM range' });
      return;
    }
    const start = new Date(rawStartDate);
    const end   = new Date(rawEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      res.status(400).json({ error: 'Invalid startDate / endDate' });
      return;
    }
    req.dashboardFilters = { dateRange, startDate: start, endDate: end, repName: rawRepName, tier: rawTier };
    next(); return;
  }

  const { startDate, endDate } = resolveDateRange(dateRange);
  req.dashboardFilters = { dateRange, startDate, endDate, repName: rawRepName, tier: rawTier };
  next();
}
