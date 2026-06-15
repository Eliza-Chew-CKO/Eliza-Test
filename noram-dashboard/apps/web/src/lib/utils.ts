import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

// -----------------------------------------------------------------------
// cn — className merge helper (clsx + tailwind-merge)
// Deduplicates Tailwind classes and merges class strings safely.
// -----------------------------------------------------------------------
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// -----------------------------------------------------------------------
// formatCurrency — formats a number as a USD currency string.
// Examples: formatCurrency(1234567.89) → "$1,234,567.89"
//           formatCurrency(5000, 'GBP') → "£5,000.00"
// -----------------------------------------------------------------------
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// -----------------------------------------------------------------------
// formatPct — formats a decimal or percentage value as a percentage string.
// Pass the value already multiplied (e.g. 12.5 → "12.5%").
// -----------------------------------------------------------------------
export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// -----------------------------------------------------------------------
// calcVariance — computes absolute and percentage variance between
// actual and target values.
// Returns { absolute, pct } where pct is signed (+ve = over target).
// -----------------------------------------------------------------------
export function calcVariance(
  actual: number,
  target: number
): { absolute: number; pct: number } {
  const absolute = actual - target;
  const pct = target !== 0 ? (absolute / target) * 100 : 0;
  return { absolute, pct };
}

// -----------------------------------------------------------------------
// getRunRate — projects a MTD value to end-of-month based on elapsed days.
// Useful for forecasting whether a rep / region will hit their target.
// -----------------------------------------------------------------------
export function getRunRate(
  mtdValue: number,
  dayOfMonth: number,
  daysInMonth: number
): number {
  if (dayOfMonth <= 0) return 0;
  return (mtdValue / dayOfMonth) * daysInMonth;
}

// -----------------------------------------------------------------------
// formatMonth — returns a human-readable month label from a Date or ISO string.
// Example: formatMonth('2025-01-01') → "Jan 2025"
// -----------------------------------------------------------------------
export function formatMonth(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM yyyy');
}

// -----------------------------------------------------------------------
// formatNumber — compact number formatting for large values in charts.
// Example: formatNumber(1500000) → "1.5M"
// -----------------------------------------------------------------------
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
