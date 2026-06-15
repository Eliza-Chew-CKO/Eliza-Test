'use client';

import { formatCurrency, formatPct, calcVariance, cn } from '@/lib/utils';

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

function formatValue(
  value: number,
  formatAs: KPICardProps['formatAs'] = 'currency',
  prefix?: string,
  suffix?: string
): string {
  let formatted: string;
  if (formatAs === 'currency') {
    formatted = formatCurrency(value);
  } else if (formatAs === 'percent') {
    formatted = formatPct(value);
  } else {
    formatted = new Intl.NumberFormat('en-US').format(value);
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
  const hasTarget = target !== undefined && target !== null;
  const variance = hasTarget ? calcVariance(value, target) : null;
  const isPositive = variance ? variance.absolute >= 0 : null;

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 w-24 rounded bg-neutral-200" />
        <div className="mt-3 h-8 w-32 rounded bg-neutral-200" />
        <div className="mt-2 h-3 w-20 rounded bg-neutral-100" />
      </div>
    );
  }

  return (
    <div className="card-hover group">
      {/* Title */}
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {title}
      </p>

      {/* Primary value */}
      <p className="mt-2 text-2xl font-bold text-neutral-900">
        {formatValue(value, formatAs, prefix, suffix)}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-0.5 text-xs text-neutral-400">{subtitle}</p>
      )}

      {/* Target + variance row */}
      {hasTarget && variance && (
        <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
          <span className="text-xs text-neutral-400">
            Target: {formatValue(target, formatAs, prefix, suffix)}
          </span>
          <span
            className={cn(
              'badge text-xs',
              isPositive ? 'badge-success' : 'badge-danger'
            )}
          >
            {isPositive ? '▲' : '▼'} {formatPct(Math.abs(variance.pct))}
          </span>
        </div>
      )}

      {/* Absolute variance */}
      {hasTarget && variance && (
        <p
          className={cn(
            'mt-1 text-xs font-medium',
            isPositive ? 'text-success-700' : 'text-danger-700'
          )}
        >
          {isPositive ? '+' : ''}
          {formatValue(variance.absolute, formatAs, prefix, suffix)} vs target
        </p>
      )}
    </div>
  );
}
