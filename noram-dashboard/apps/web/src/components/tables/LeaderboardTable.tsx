'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { LeaderboardEntry } from '@/types';
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
    accessorKey: 'repName',
    cell: ({ getValue }) => (
      <p className="font-medium text-neutral-900">{getValue<string>()}</p>
    ),
  },
  {
    id: 'mrYTD',
    header: 'YTD Revenue',
    accessorKey: 'mrYTD',
    cell: ({ getValue }) => (
      <span className="font-semibold text-neutral-800">
        {formatCurrency(getValue<number>(), 'USD', true)}
      </span>
    ),
  },
  {
    id: 'mrLastMonth',
    header: 'Last Month NR',
    accessorKey: 'mrLastMonth',
    cell: ({ getValue }) => (
      <span className="text-neutral-500">
        {formatCurrency(getValue<number>(), 'USD', true)}
      </span>
    ),
  },
  {
    id: 'mrYTDPct',
    header: 'vs #1',
    accessorKey: 'mrYTDPct',
    cell: ({ getValue }) => {
      const pct = getValue<number>();
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-400"
              style={{ width: `${Math.round(pct * 100)}%` }}
            />
          </div>
          <span className="text-xs text-neutral-500">{Math.round(pct * 100)}%</span>
        </div>
      );
    },
  },
  {
    id: 'dealCount',
    header: 'Deals Closed',
    accessorKey: 'dealCount',
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
