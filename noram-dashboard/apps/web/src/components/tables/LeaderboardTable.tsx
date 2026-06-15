'use client';

import { cn, formatCurrency, formatPct, calcVariance } from '@/lib/utils';
import type { User } from '@/types';

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

const MEDAL_COLORS: Record<number, string> = {
  1: 'text-yellow-500',
  2: 'text-neutral-400',
  3: 'text-amber-600',
};

const MEDAL_LABELS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

function SkeletonRow() {
  return (
    <tr className="border-b border-neutral-100">
      {[40, 140, 90, 90, 70, 80].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-3.5 animate-pulse rounded bg-neutral-200"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function LeaderboardTable({ data, isLoading = false }: LeaderboardTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3 text-left w-12">Rank</th>
            <th className="px-4 py-3 text-left">Rep</th>
            <th className="px-4 py-3 text-right">Revenue</th>
            <th className="px-4 py-3 text-right">Target</th>
            <th className="px-4 py-3 text-right">Variance</th>
            <th className="px-4 py-3 text-right">Deals</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            : data.length === 0
            ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-neutral-400">
                  No data available
                </td>
              </tr>
            )
            : data.map((row) => {
                const v = calcVariance(row.revenue, row.target);
                const isPositive = v.absolute >= 0;

                return (
                  <tr
                    key={row.rep.id}
                    className={cn(
                      'transition-colors hover:bg-neutral-50',
                      row.rank <= 3 && 'bg-neutral-50/50',
                    )}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-sm font-bold',
                          MEDAL_COLORS[row.rank] ?? 'text-neutral-500',
                        )}
                      >
                        {MEDAL_LABELS[row.rank] ?? `#${row.rank}`}
                      </span>
                    </td>

                    {/* Rep */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                          {row.rep.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900">{row.rep.name}</p>
                          <p className="text-xs text-neutral-400">{row.rep.salesRegion}</p>
                        </div>
                      </div>
                    </td>

                    {/* Revenue */}
                    <td className="px-4 py-3 text-right font-medium text-neutral-900">
                      {formatCurrency(row.revenue)}
                    </td>

                    {/* Target */}
                    <td className="px-4 py-3 text-right text-neutral-500">
                      {formatCurrency(row.target)}
                    </td>

                    {/* Variance */}
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          isPositive ? 'text-success-600' : 'text-danger-600',
                        )}
                      >
                        {isPositive ? '+' : ''}
                        {formatPct(v.pct / 100)}
                      </span>
                    </td>

                    {/* Deals */}
                    <td className="px-4 py-3 text-right font-medium text-neutral-700">
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
