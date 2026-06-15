import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, getDaysInMonth } from 'date-fns';

// ─── Class name helper ────────────────────────────────────────────────────────

/**
 * Merges Tailwind class names, resolving conflicts via tailwind-merge.
 * Accepts any value accepted by clsx (strings, arrays, objects).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Currency formatter ───────────────────────────────────────────────────────

/**
 * Formats a numeric value as a currency string.
 * Defaults to USD. Uses compact notation for large values (>= 1,000,000).
 *
 * @example
 *   formatCurrency(1500000)     // "$1.5M"
 *   formatCurrency(75000)       // "$75,000"
 *   formatCurrency(99.5, 'GBP') // "£99.50"
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  if (Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Percentage formatter ─────────────────────────────────────────────────────

/**
 * Formats a ratio (0–1) or a percentage value as a readable percentage string.
 * Automatically detects whether the value is a ratio (< 2) or a percentage.
 *
 * @example
 *   formatPct(0.123)    // "12.3%"
 *   formatPct(85.6, 0) // "86%"
 */
export function formatPct(value: number, decimals = 1): string {
  const pct = Math.abs(value) < 2 ? value * 100 : value;
  return `${pct.toFixed(decimals)}%`;
}

// ─── Variance calculator ──────────────────────────────────────────────────────

/**
 * Calculates absolute and percentage variance between actual and target.
 * Returns positive values when actual > target.
 */
export function calcVariance(
  actual: number,
  target: number,
): { absolute: number; pct: number } {
  const absolute = actual - target;
  const pct = target === 0 ? 0 : (absolute / target) * 100;
  return { absolute, pct };
}

// ─── Run rate calculator ──────────────────────────────────────────────────────

/**
 * Projects a month-to-date value to an end-of-month run rate.
 *
 * @param mtdValue     - Value accumulated so far this month
 * @param dayOfMonth   - Current calendar day (1–31)
 * @param daysInMonth  - Total days in the current month
 * @returns Projected full-month value
 */
export function getRunRate(
  mtdValue: number,
  dayOfMonth: number,
  daysInMonth: number,
): number {
  if (dayOfMonth <= 0) return 0;
  return (mtdValue / dayOfMonth) * daysInMonth;
}

/**
 * Convenience wrapper that calculates run rate from a Date object.
 */
export function getRunRateFromDate(mtdValue: number, asOf: Date = new Date()): number {
  const day = asOf.getDate();
  const total = getDaysInMonth(asOf);
  return getRunRate(mtdValue, day, total);
}

// ─── Month formatter ──────────────────────────────────────────────────────────

/**
 * Formats a date to "Mon YYYY" label for chart axes.
 *
 * @example
 *   formatMonth(new Date('2025-01-15')) // "Jan 2025"
 *   formatMonth('2025-06-01')           // "Jun 2025"
 */
export function formatMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM yyyy');
}

// ─── Number formatter ─────────────────────────────────────────────────────────

/**
 * Formats a plain number with thousands separators.
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
