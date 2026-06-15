'use client';

import { cn, formatCurrency, formatPct, calcVariance } from '@/lib/utils';

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
  switch (formatAs) {
    case 'currency':
      formatted = formatCurrency(value);
      break;
    case 'percent':
      formatted = formatPct(value);
      break;
    case 'number':
    default:
      formatted = new Intl.NumberFormat('en-US').format(value);
      break;
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
  const { absolute, pct } = target != null ? calcVariance(value, target) : { absolute: 0, pct: 0 };
  const isPositive = absolute >= 0;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-card animate-pulse">
        <div className="h-4 w-2/3 rounded bg-neutral-200 mb-3" />
        <div className="h-8 w-1/2 rounded bg-neutral-200 mb-2" />
        <div className="h-3 w-1/3 rounded bg-neutral-200" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-card hover:shadow-card-hover transition-shadow">
      {/* Title */}
      <p className="text-sm font-medium text-neutral-500 truncate">{title}</p>

      {/* Primary value */}
      <p className="mt-1.5 text-2xl font-bold text-neutral-900 tabular-nums">
        {formatValue(value, formatAs, prefix, suffix)}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-0.5 text-xs text-neutral-400">{subtitle}</p>
      )}

      {/* Target + variance */}
      {target != null && (
        <div className="mt-3 flex items-center gap-3 border-t border-neutral-100 pt-3">
          <div className="text-xs text-neutral-500">
            Target: <span className="font-medium text-neutral-700">{formatValue(target, formatAs, prefix, suffix)}</span>
          </div>
          <div
            className={cn(
              'ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
              isPositive
                ? 'bg-success-50 text-success-700'
                : 'bg-danger-50 text-danger-700'
            )}
          >
            <span>{isPositive ? '▲' : '▼'}</span>
            <span>{formatPct(Math.abs(pct))}</span>
          </div>
        </div>
      )}

      {/* Run rate indicator when target provided and variance is negative */}
      {target != null && !isPositive && (
        <p className="mt-1 text-xs text-danger-600">
          {formatCurrency(Math.abs(absolute))} below target
        </p>
      )}
    </div>
  );
}
