import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

// ─── Class name helper ────────────────────────────────────────────────────────

/**
 * Merges Tailwind class names, resolving conflicts via tailwind-merge.
 * Usage: cn('px-4 py-2', condition && 'bg-blue-500', 'px-6') → 'py-2 bg-blue-500 px-6'
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Number formatting ────────────────────────────────────────────────────────

/**
 * Format a number as a USD currency string.
 * @example formatCurrency(1234567.89) → "$1,234,568"
 * @example formatCurrency(1234567.89, 'GBP') → "£1,234,568"
 */
export function formatCurrency(
  value: number,
  currency = 'USD',
  maximumFractionDigits = 0
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(value);
}

/**
 * Format a decimal ratio as a percentage string.
 * @example formatPct(0.1234) → "12.3%"
 * @example formatPct(0.1234, 2) → "12.34%"
 */
export function formatPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a large number with K/M/B suffixes for compact display.
 * @example formatCompact(1_250_000) → "$1.3M"
 */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

// ─── Variance calculation ─────────────────────────────────────────────────────

/**
 * Calculate absolute and percentage variance between actual and target.
 * A positive variance means actual exceeded target.
 */
export function calcVariance(
  actual: number,
  target: number
): { absolute: number; pct: number } {
  const absolute = actual - target;
  const pct = target !== 0 ? absolute / target : 0;
  return { absolute, pct };
}

// ─── Run rate ─────────────────────────────────────────────────────────────────

/**
 * Project a month-to-date value to a full-month run rate.
 * @param mtdValue  Value accumulated so far this month
 * @param dayOfMonth  Current day of the month (1-based)
 * @param daysInMonth  Total days in the month
 */
export function getRunRate(
  mtdValue: number,
  dayOfMonth: number,
  daysInMonth: number
): number {
  if (dayOfMonth <= 0) return 0;
  return (mtdValue / dayOfMonth) * daysInMonth;
}

// ─── Date formatting ──────────────────────────────────────────────────────────

/**
 * Format a date as a short month + year label for chart axes.
 * @example formatMonth(new Date('2025-01-01')) → "Jan 2025"
 * @example formatMonth('2025-01-01') → "Jan 2025"
 */
export function formatMonth(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM yyyy');
}

/**
 * Format a date as a short display string.
 * @example formatDate('2025-06-15') → "15 Jun 2025"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'd MMM yyyy');
}
