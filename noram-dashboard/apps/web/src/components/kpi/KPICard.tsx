'use client';

import { cn, formatCurrency, formatPct, formatNumber, calcVariance, varianceColorClass } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  target?: number;
  prefix?: string;
  suffix?: string;
  /** Controls how the value (and target) are displayed */
  formatAs?: 'currency' | 'number' | 'percent';
  subtitle?: string;
  isLoading?: boolean;
  /** Show a compact run-rate projection badge */
  runRate?: number;
}

function formatValue(value: number, formatAs: KPICardProps['formatAs'] = 'currency'): string {
  switch (formatAs) {
    case 'currency': return formatCurrency(value, 'USD', true);
    case 'percent':  return formatPct(value / 100);
    case 'number':   return formatNumber(value);
    default:         return String(value);
  }
}

export function KPICard({
  title,
  value,
  target,
  prefix,
  suffix,
  formatAs = 'currency',
  subtitle,
  isLoading = false,
  runRate,
}: KPICardProps) {
  const variance = target !== undefined ? calcVariance(value, target) : null;

  if (isLoading) {
    return (
      <div className="card flex flex-col gap-3">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-8 w-32 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-2 hover:shadow-card-hover transition-shadow">
      {/* Title */}
      <p className="card-title">{title}</p>

      {/* Primary value */}
      <p className="text-2xl font-bold text-neutral-900 tracking-tight">
        {prefix && <span className="text-lg font-semibold text-neutral-500 mr-0.5">{prefix}</span>}
        {formatValue(value, formatAs)}
        {suffix && <span className="text-base font-normal text-neutral-400 ml-0.5">{suffix}</span>}
      </p>

      {/* Target + variance row */}
      {target !== undefined && variance && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-neutral-400">
            Target: {formatValue(target, formatAs)}
          </span>
          <span className={cn('font-semibold', varianceColorClass(variance.absolute))}>
            {variance.absolute >= 0 ? '+' : ''}
            {formatValue(Math.abs(variance.absolute), formatAs)}{' '}
            ({variance.pct >= 0 ? '+' : ''}
            {formatPct(Math.abs(variance.pct))})
          </span>
        </div>
      )}

      {/* Run rate projection */}
      {runRate !== undefined && (
        <div className="mt-1 rounded-md bg-neutral-50 px-2.5 py-1.5 text-xs">
          <span className="text-neutral-500">Run rate: </span>
          <span className="font-semibold text-neutral-700">
            {formatValue(runRate, formatAs)}
          </span>
        </div>
      )}

      {/* Optional subtitle */}
      {subtitle && (
        <p className="text-xs text-neutral-400">{subtitle}</p>
      )}
    </div>
  );
}
