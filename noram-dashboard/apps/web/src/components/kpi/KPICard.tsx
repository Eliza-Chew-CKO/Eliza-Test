'use client';

import { formatCurrency, formatPct, calcVariance, cn } from '@/lib/utils';

type FormatAs = 'currency' | 'number' | 'percent';

interface KPICardProps {
  title: string;
  value: number;
  target?: number;
  prefix?: string;
  suffix?: string;
  formatAs?: FormatAs;
  subtitle?: string;
  isLoading?: boolean;
}

function formatValue(value: number, formatAs: FormatAs, prefix?: string, suffix?: string): string {
  let formatted: string;
  switch (formatAs) {
    case 'currency':
      formatted = formatCurrency(value);
      break;
    case 'percent':
      formatted = formatPct(value);
      break;
    default:
      formatted = value.toLocaleString();
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
  const variance = target != null ? calcVariance(value, target) : null;
  const isPositive = variance ? variance.pct >= 0 : null;

  if (isLoading) {
    return (
      <div className="card flex flex-col gap-3">
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-8 w-3/4" />
        <div className="skeleton h-3 w-1/3" />
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-2 hover:shadow-card-hover transition-shadow">
      {/* Title */}
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </p>

      {/* Main value */}
      <p className="text-2xl font-bold text-neutral-900 leading-none">
        {formatValue(value, formatAs, prefix, suffix)}
      </p>

      {/* Variance vs target */}
      {variance != null && (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
              isPositive
                ? 'bg-success-50 text-success-700'
                : 'bg-danger-50 text-danger-600'
            )}
          >
            {isPositive ? '▲' : '▼'} {formatPct(Math.abs(variance.pct))}
          </span>
          <span className="text-xs text-neutral-400">
            vs target {formatValue(target!, formatAs)}
          </span>
        </div>
      )}

      {/* Subtitle / run-rate note */}
      {subtitle && (
        <p className="text-xs text-neutral-400">{subtitle}</p>
      )}
    </div>
  );
}
