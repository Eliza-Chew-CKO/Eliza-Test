'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { User } from '@/types';
import { formatCurrency, formatPct, calcVariance, cn } from '@/lib/utils';
import DataTable from './DataTable';

export interface LeaderboardRow {
  rank: number;
  rep: User;
  revenue: number;
  target: number;
  deals: number;
}

const MEDAL_STYLES: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-700 font-bold',  // Gold
  2: 'bg-neutral-100 text-neutral-600 font-bold', // Silver
  3: 'bg-orange-100 text-orange-700 font-bold',  // Bronze
};

interface LeaderboardTableProps {
  data: LeaderboardRow[];
  isLoading?: boolean;
}

const columns: ColumnDef<LeaderboardRow>[] = [
  {
    id: 'rank',
    header: '#',
    accessorKey: 'rank',
    cell: ({ getValue }) => {
      const rank = getValue<number>();
      return (
        <span
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
            MEDAL_STYLES[rank] ?? 'text-neutral-500'
          )}
        >
          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
        </span>
      );
    },
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
      <span className="font-medium">{formatCurrency(getValue<number>())}</span>
    ),
  },
  {
    id: 'target',
    header: 'Target',
    accessorKey: 'target',
    cell: ({ getValue }) => formatCurrency(getValue<number>()),
  },
  {
    id: 'variance',
    header: 'Variance',
    accessorFn: (row) => calcVariance(row.revenue, row.target).pct,
    cell: ({ row }) => {
      const { absolute, pct } = calcVariance(row.original.revenue, row.original.target);
      const positive = pct >= 0;
      return (
        <div>
          <span
            className={cn(
              'text-xs font-semibold',
              positive ? 'text-success-600' : 'text-danger-600'
            )}
          >
            {positive ? '+' : ''}{formatCurrency(absolute)}
          </span>
          <span
            className={cn(
              'ml-1 text-xs',
              positive ? 'text-success-500' : 'text-danger-500'
            )}
          >
            ({positive ? '+' : ''}{formatPct(pct)})
          </span>
        </div>
      );
    },
  },
  {
    id: 'deals',
    header: 'Deals Closed',
    accessorKey: 'deals',
    cell: ({ getValue }) => (
      <span className="inline-flex items-center justify-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
        {getValue<number>()}
      </span>
    ),
  },
];

export default function LeaderboardTable({ data, isLoading = false }: LeaderboardTableProps) {
  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      pageSize={10}
    />
  );
}
