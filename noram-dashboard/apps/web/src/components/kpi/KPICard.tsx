import { cn, formatCurrency, formatPct, varianceColor } from '@/lib/utils';
import type { KPIMetric } from '@/types';

interface Props {
  metric: KPIMetric;
  className?: string;
}

export default function KPICard({ metric, className }: Props) {
  const { label, value, target, varianceAbs, variancePct, runRate, currency = true } = metric;

  return (
    <div className={cn('bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2', className)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{label}</p>

      <p className="text-3xl font-bold text-white">
        {currency ? formatCurrency(value, true) : value.toLocaleString()}
      </p>

      {target !== undefined && variancePct !== undefined && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">vs target</span>
          <span className={cn('font-semibold', varianceColor(variancePct))}>
            {formatPct(variancePct)}
          </span>
          {varianceAbs !== undefined && (
            <span className={cn('text-xs', varianceColor(varianceAbs))}>
              ({currency ? formatCurrency(varianceAbs, true) : varianceAbs.toLocaleString()})
            </span>
          )}
        </div>
      )}

      {runRate !== undefined && (
        <p className="text-xs text-gray-500">
          Run Rate: <span className="text-gray-300 font-medium">{formatCurrency(runRate, true)}</span>
        </p>
      )}
    </div>
  );
}
