'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import DataTable from './DataTable';
import { formatCurrency, formatPct, calcVariance, cn } from '@/lib/utils';
import type { User, LeaderboardEntry } from '@/types';

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
  isLoading?: boolean;
}

const MEDAL_COLORS: Record<number, string> = {
  1: 'text-yellow-500',  // Gold
  2: 'text-neutral-400', // Silver
  3: 'text-amber-600',   // Bronze
};

function RankCell({ rank }: { rank: number }) {
  const colorClass = MEDAL_COLORS[rank] ?? 'text-neutral-400';
  return (
    <span className={cn('font-bold tabular-nums text-sm', colorClass)}>
      {rank <= 3 ? (
        <span className="text-base">{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>
      ) : (
        `#${rank}`
      )}
    </span>
  );
}

export default function LeaderboardTable({ data, isLoading = false }: LeaderboardTableProps) {
  const columns = useMemo<ColumnDef<LeaderboardEntry, unknown>[]>(
    () => [
      {
        id: 'rank',
        header: 'Rank',
        accessorKey: 'rank',
        cell: ({ getValue }) => <RankCell rank={getValue() as number} />,
        size: 60,
      },
      {
        id: 'rep',
        header: 'Rep',
        accessorFn: (row) => row.rep.name,
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-900">{row.original.rep.name}</p>
            <p className="text-xs text-neutral-400">{row.original.rep.salesRegion}</p>
          </div>
        ),
      },
      {
        id: 'revenue',
        header: 'Revenue (Actual)',
        accessorKey: 'revenue',
        cell: ({ getValue }) => (
          <span className="font-medium tabular-nums">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'target',
        header: 'Target',
        accessorKey: 'target',
        cell: ({ getValue }) => (
          <span className="text-neutral-500 tabular-nums">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'variance',
        header: 'Variance',
        accessorFn: (row) => calcVariance(row.revenue, row.target).pct,
        cell: ({ row }) => {
          const { absolute, pct } = calcVariance(row.original.revenue, row.original.target);
          const isPositive = absolute >= 0;
          return (
            <div className="space-y-0.5">
              <span
                className={cn(
                  'text-xs font-semibold',
                  isPositive ? 'text-success-600' : 'text-danger-600',
                )}
              >
                {isPositive ? '+' : ''}
                {formatCurrency(absolute)}
              </span>
              <p
                className={cn(
                  'text-xs',
                  isPositive ? 'text-success-500' : 'text-danger-500',
                )}
              >
                ({isPositive ? '+' : ''}
                {formatPct(pct / 100)})
              </p>
            </div>
          );
        },
      },
      {
        id: 'deals',
        header: 'Deals',
        accessorKey: 'deals',
        cell: ({ getValue }) => (
          <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
            {getValue() as number}
          </span>
        ),
      },
    ],
    [],
  );

  return <DataTable data={data} columns={columns} isLoading={isLoading} pageSize={10} />;
}
