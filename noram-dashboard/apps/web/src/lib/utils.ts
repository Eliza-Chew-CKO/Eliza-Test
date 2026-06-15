import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS class names safely, resolving conflicts via tailwind-merge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as USD currency using Intl.NumberFormat.
 * @param value - Numeric value to format
 * @param currency - ISO 4217 currency code (default: 'USD')
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a decimal ratio as a percentage string.
 * @param value - Decimal ratio (e.g. 0.154 → "15.4%")
 * @param decimals - Number of decimal places (default: 1)
 */
export function formatPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Calculate variance between actual and target values.
 * @returns absolute difference and percentage variance as a decimal
 */
export function calcVariance(actual: number, target: number): { absolute: number; pct: number } {
  if (target === 0) return { absolute: actual, pct: 0 };
  const absolute = actual - target;
  const pct = absolute / target;
  return { absolute, pct };
}

/**
 * Extrapolate a run-rate for the full month based on MTD progress.
 * @param mtdValue - Month-to-date cumulative value
 * @param dayOfMonth - Current day number (1–31)
 * @param daysInMonth - Total days in the current month
 */
export function getRunRate(mtdValue: number, dayOfMonth: number, daysInMonth: number): number {
  if (dayOfMonth === 0) return 0;
  return (mtdValue / dayOfMonth) * daysInMonth;
}

/**
 * Format a Date (or ISO string) as "Jan 2025".
 */
export function formatMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Return a Tailwind text colour class based on variance sign.
 */
export function varianceColor(value: number): string {
  if (value >= 0) return 'text-green-400';
  if (value >= -0.05) return 'text-yellow-400';
  return 'text-red-400';
}
