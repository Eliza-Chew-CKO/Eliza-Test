'use client';

import type { User } from '@/types';
import { formatCurrency, formatPct, calcVariance, cn } from '@/lib/utils';

interface LeaderboardRow {
  rank: number;
  rep: User;
  revenue: number;
  target: number;
  deals: number;
}

interface LeaderboardTableProps {
  data: LeaderboardRow[];
  isLoading?: boolean;
}

// Medal colours for top 3
const MEDAL: Record<number, { bg: string; text: string; icon: string }> = {
  1: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '🥇' },
  2: { bg: 'bg-neutral-100', text: 'text-neutral-600', icon: '🥈' },
  3: { bg: 'bg-orange-50', text: 'text-orange-600', icon: '🥉' },
};

const SKELETON_ROWS = 5;

export default function LeaderboardTable({ data, isLoading = false }: LeaderboardTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm animate-pulse">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              {['Rank', 'Rep', 'Revenue', 'Target', 'Variance', 'Deals'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 rounded bg-neutral-200" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 w-12">
              Rank
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Rep
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Revenue
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Target
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Variance
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Deals
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 bg-white">
          {data.map((row) => {
            const medal = MEDAL[row.rank];
            const { absolute, pct } = calcVariance(row.revenue, row.target);
            const isPositive = absolute >= 0;

            return (
              <tr
                key={row.rep.id}
                className={cn(
                  'transition-colors',
                  medal ? medal.bg : 'hover:bg-neutral-50'
                )}
              >
                {/* Rank */}
                <td className="px-4 py-3 text-sm font-semibold text-neutral-700">
                  {medal ? (
                    <span title={`#${row.rank}`}>{medal.icon}</span>
                  ) : (
                    <span className={cn('tabular-nums', medal?.text ?? 'text-neutral-400')}>
                      #{row.rank}
                    </span>
                  )}
                </td>

                {/* Rep */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                      {row.rep.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{row.rep.name}</p>
                      <p className="text-xs text-neutral-400">{row.rep.salesRegion}</p>
                    </div>
                  </div>
                </td>

                {/* Revenue */}
                <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-neutral-900">
                  {formatCurrency(row.revenue)}
                </td>

                {/* Target */}
                <td className="px-4 py-3 text-right text-sm tabular-nums text-neutral-500">
                  {formatCurrency(row.target)}
                </td>

                {/* Variance */}
                <td className="px-4 py-3 text-right">
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                      isPositive ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'
                    )}
                  >
                    {isPositive ? '+' : ''}{formatPct(pct)}
                  </span>
                </td>

                {/* Deals closed */}
                <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-neutral-700">
                  {row.deals}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
