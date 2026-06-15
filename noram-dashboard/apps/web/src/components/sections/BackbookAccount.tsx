'use client';

import { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { DashboardFilters, BackbookClientRow } from '@/types';
import { fetchManagedAccounts, fetchUnmanagedAccounts } from '@/lib/api';
import { DataTable } from '@/components/tables/DataTable';
import { KPICard } from '@/components/kpi/KPICard';
import { formatCurrency, formatPct, cn } from '@/lib/utils';

interface BackbookAccountProps {
  filters: DashboardFilters;
}

interface AccountRow extends BackbookClientRow {
  isManaged: boolean;
}

const columns: ColumnDef<AccountRow, any>[] = [
  {
    id: 'alias',
    header: 'Account',
    accessorKey: 'alias',
    cell: ({ getValue }) => (
      <span className="font-medium text-neutral-900">{getValue<string>()}</span>
    ),
  },
  {
    id: 'tier',
    header: 'Tier',
    accessorKey: 'tier',
    cell: ({ getValue }) => {
      const tier = getValue<string | null>();
      const styles: Record<string, string> = {
        TIER_1: 'bg-primary-50 text-primary-700',
        TIER_2: 'bg-purple-50 text-purple-700',
        TIER_3: 'bg-neutral-100 text-neutral-600',
      };
      return tier ? (
        <span className={cn('badge', styles[tier] ?? 'bg-neutral-100 text-neutral-600')}>
          {tier.replace('_', ' ')}
        </span>
      ) : <span className="text-neutral-300">—</span>;
    },
  },
  {
    id: 'isManaged',
    header: 'Managed',
    accessorKey: 'isManaged',
    cell: ({ getValue }) =>
      getValue<boolean>() ? (
        <span className="badge bg-success-100 text-success-700">Managed</span>
      ) : (
        <span className="badge bg-neutral-100 text-neutral-500">Unmanaged</span>
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
    cell: ({ getValue }) => formatCurrency(getValue<number>(), 'USD', true),
  },
  {
    id: 'tpvYTD',
    header: 'YTD TPV',
    accessorKey: 'tpvYTD',
    cell: ({ getValue }) => formatCurrency(getValue<number>(), 'USD', true),
  },
  {
    id: 'mrYoYPct',
    header: 'YoY',
    accessorKey: 'mrYoYPct',
    cell: ({ getValue }) => {
      const v = getValue<number | null>();
      if (v == null) return <span className="text-neutral-300">—</span>;
      const positive = v >= 0;
      return (
        <span className={cn('font-medium text-xs', positive ? 'text-success-600' : 'text-danger-600')}>
          {positive ? '+' : ''}{(v * 100).toFixed(1)}%
        </span>
      );
    },
  },
  {
    id: 'accountManager',
    header: 'AM',
    accessorKey: 'accountManager',
    cell: ({ getValue }) => {
      const v = getValue<string | null>();
      return v ? <span className="text-neutral-500 text-xs">{v}</span> : <span className="text-neutral-300">—</span>;
    },
  },
  {
    id: 'salesRep',
    header: 'Rep',
    accessorKey: 'salesRep',
    cell: ({ getValue }) => {
      const v = getValue<string | null>();
      return v ? <span className="text-neutral-500 text-xs">{v}</span> : <span className="text-neutral-300">—</span>;
    },
  },
];

export function BackbookAccount({ filters }: BackbookAccountProps) {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([fetchManagedAccounts(filters), fetchUnmanagedAccounts(filters)])
      .then(([managed, unmanaged]) => setAccounts([...managed, ...unmanaged]))
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [filters]);

  const managedCount = accounts.filter((a) => a.isManaged).length;
  const unmanagedCount = accounts.length - managedCount;
  const managedRevenue = accounts
    .filter((a) => a.isManaged)
    .reduce((s, a) => s + a.mrYTD, 0);
  const unmanagedRevenue = accounts
    .filter((a) => !a.isManaged)
    .reduce((s, a) => s + a.mrYTD, 0);

  return (
    <section aria-labelledby="backbook-heading">
      <div className="mb-4">
        <h2 id="backbook-heading" className="text-base font-semibold text-neutral-900">
          Backbook Accounts
        </h2>
        <p className="text-sm text-neutral-500 mt-0.5">
          Existing account health — managed vs unmanaged revenue and VAMP
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 mb-4">
          Failed to load backbook: {error}
        </div>
      )}

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-5">
        <KPICard
          title="Managed Accounts"
          value={managedCount}
          formatAs="number"
          subtitle="Accounts with dedicated AM"
          isLoading={isLoading}
        />
        <KPICard
          title="Unmanaged Accounts"
          value={unmanagedCount}
          formatAs="number"
          subtitle="Self-serve accounts"
          isLoading={isLoading}
        />
        <KPICard
          title="Managed Revenue"
          value={managedRevenue}
          formatAs="currency"
          subtitle="Net rev MTD – managed"
          isLoading={isLoading}
        />
        <KPICard
          title="Unmanaged Revenue"
          value={unmanagedRevenue}
          formatAs="currency"
          subtitle="Net rev MTD – unmanaged"
          isLoading={isLoading}
        />
      </div>

      {/* Account table */}
      <div className="card">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Account List</h3>
        <DataTable
          data={accounts}
          columns={columns}
          isLoading={isLoading}
          pageSize={15}
        />
      </div>
    </section>
  );
}
