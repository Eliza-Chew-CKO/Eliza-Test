'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { User, LeaderboardEntry } from '@/types';
import { DataTable } from './DataTable';
import { formatCurrency, formatPct, calcVariance, cn } from '@/lib/utils';

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
  isLoading?: boolean;
}

// Medal colours for top 3 positions
function RankBadge({ rank }: { rank: number }) {
  const styles: Record<number, string> = {
    1: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300',
    2: 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-300',
    3: 'bg-orange-100 text-orange-700 ring-1 ring-orange-300',
  };
  return (
    <span
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
        styles[rank] ?? 'bg-neutral-50 text-neutral-400',
      )}
    >
      {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
    </span>
  );
}

const columns: ColumnDef<LeaderboardEntry, any>[] = [
  {
    id: 'rank',
    header: 'Rank',
    accessorKey: 'rank',
    cell: ({ getValue }) => <RankBadge rank={getValue<number>()} />,
    size: 60,
  },
  {
    id: 'rep',
    header: 'Sales Rep',
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
      <span className="font-semibold text-neutral-800">
        {formatCurrency(getValue<number>(), 'USD', true)}
      </span>
    ),
  },
  {
    id: 'target',
    header: 'Target',
    accessorKey: 'target',
    cell: ({ getValue }) => (
      <span className="text-neutral-500">
        {formatCurrency(getValue<number>(), 'USD', true)}
      </span>
    ),
  },
  {
    id: 'variance',
    header: 'vs Target',
    accessorFn: (row) => row.revenue - row.target,
    cell: ({ row }) => {
      const { absolute, pct } = calcVariance(row.original.revenue, row.original.target);
      const isPositive = absolute >= 0;
      return (
        <span
          className={cn(
            'inline-flex flex-col text-xs font-semibold',
            isPositive ? 'text-success-600' : 'text-danger-600',
          )}
        >
          <span>
            {isPositive ? '+' : ''}
            {formatCurrency(absolute, 'USD', true)}
          </span>
          <span className="font-normal opacity-80">
            ({isPositive ? '+' : ''}{formatPct(Math.abs(pct))})
          </span>
        </span>
      );
    },
  },
  {
    id: 'deals',
    header: 'Deals Closed',
    accessorKey: 'deals',
    cell: ({ getValue }) => (
      <span className="font-medium text-neutral-700">{getValue<number>()}</span>
    ),
  },
];

export function LeaderboardTable({ data, isLoading }: LeaderboardTableProps) {
  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      pageSize={15}
    />
  );
}
