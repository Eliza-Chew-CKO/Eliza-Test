'use client';

import { cn, formatCurrency, formatPct, calcVariance, varianceColor } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  target?: number;
  prefix?: string;
  suffix?: string;
  formatAs?: 'currency' | 'number' | 'percent';
  subtitle?: string;
  isLoading?: boolean;
}

function formatValue(value: number, formatAs: KPICardProps['formatAs'], prefix?: string, suffix?: string): string {
  let formatted: string;
  if (formatAs === 'currency') {
    formatted = formatCurrency(value);
  } else if (formatAs === 'percent') {
    formatted = formatPct(value);
  } else {
    formatted = value.toLocaleString('en-US');
  }
  return `${prefix ?? ''}${formatted}${suffix ?? ''}`;
}

export default function KPICard({
  title,
  value,
  target,
  prefix,
  suffix,
  formatAs = 'currency',
  subtitle,
  isLoading = false,
}: KPICardProps) {
  const variance = target !== undefined ? calcVariance(value, target) : null;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3 animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="h-8 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-2 hover:shadow-md transition-shadow">
      {/* Title */}
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>

      {/* Primary value */}
      <p className="text-2xl font-bold text-gray-900 leading-tight">
        {formatValue(value, formatAs, prefix, suffix)}
      </p>

      {/* Target + variance row */}
      {target !== undefined && variance !== null && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">
            vs {formatValue(target, formatAs, prefix, suffix)}
          </span>
          <span className={cn('font-semibold', varianceColor(variance.pct))}>
            {variance.pct >= 0 ? '+' : ''}{formatPct(variance.pct)}
          </span>
          <span className={cn('text-xs', varianceColor(variance.absolute))}>
            ({formatAs === 'currency' ? formatCurrency(Math.abs(variance.absolute)) : Math.abs(variance.absolute).toLocaleString()})
          </span>
        </div>
      )}

      {/* Optional subtitle / run-rate note */}
      {subtitle && (
        <p className="text-xs text-gray-400">{subtitle}</p>
      )}
    </div>
  );
}
