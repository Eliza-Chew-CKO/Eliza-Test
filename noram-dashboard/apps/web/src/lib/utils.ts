import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

// ─── Tailwind class helper ─────────────────────────────────────────────────────

/**
 * Merges Tailwind CSS classes with clsx + tailwind-merge to avoid conflicts.
 *
 * @example cn('px-4 py-2', isActive && 'bg-primary-500', 'text-white')
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Number formatting ──────────────────────────────────────────────────────────

/**
 * Format a number as a currency string.
 *
 * @example formatCurrency(1234567.89) // "$1,234,567.89"
 * @example formatCurrency(500000, 'GBP') // "£500,000.00"
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number as a percentage string.
 *
 * @example formatPct(0.1234) // "12.3%"
 * @example formatPct(0.1234, 2) // "12.34%"
 */
export function formatPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a large number with K / M / B abbreviations.
 *
 * @example formatCompact(1_500_000) // "$1.5M"
 */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

// ─── Variance calculations ───────────────────────────────────────────────────────

/**
 * Calculate absolute and percentage variance between actual and target.
 * Positive values = above target (favorable). Negative = below.
 *
 * @example calcVariance(110_000, 100_000) // { absolute: 10000, pct: 0.1 }
 */
export function calcVariance(
  actual: number,
  target: number
): { absolute: number; pct: number } {
  const absolute = actual - target;
  const pct = target !== 0 ? absolute / target : 0;
  return { absolute, pct };
}

// ─── Run rate ───────────────────────────────────────────────────────────────────

/**
 * Project a month-to-date value to a full-month run rate.
 *
 * @param mtdValue   Value accumulated so far this month
 * @param dayOfMonth Current day of the month (1-based)
 * @param daysInMonth Total days in the month
 * @returns Projected end-of-month value
 *
 * @example getRunRate(50_000, 10, 31) // ~155_000
 */
export function getRunRate(
  mtdValue: number,
  dayOfMonth: number,
  daysInMonth: number
): number {
  if (dayOfMonth <= 0) return 0;
  return (mtdValue / dayOfMonth) * daysInMonth;
}

// ─── Date formatting ────────────────────────────────────────────────────────────

/**
 * Format a date as "MMM yyyy" — e.g. "Jan 2025".
 *
 * @example formatMonth(new Date('2025-01-15')) // "Jan 2025"
 * @example formatMonth('2025-06-01') // "Jun 2025"
 */
export function formatMonth(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM yyyy');
}

/**
 * Format a date as a short locale string — e.g. "Jun 15, 2025".
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy');
}
