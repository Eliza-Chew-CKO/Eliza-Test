'use client';

import { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { DashboardFilters, Account } from '@/types';
import { fetchBackbook } from '@/lib/api';
import { DataTable } from '@/components/tables/DataTable';
import { KPICard } from '@/components/kpi/KPICard';
import { formatCurrency, formatShortDate, formatPct, cn } from '@/lib/utils';

interface BackbookAccountProps {
  filters: DashboardFilters;
}

interface AccountRow extends Account {
  netRevenueMTD?: number;
  tpvAmount?: number;
  vampRatio?: number;
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
      const tier = getValue<string>();
      const styles: Record<string, string> = {
        Enterprise:  'bg-primary-50 text-primary-700',
        'Mid-Market': 'bg-purple-50 text-purple-700',
        SMB:         'bg-neutral-100 text-neutral-600',
      };
      return (
        <span className={cn('badge', styles[tier] ?? 'bg-neutral-100 text-neutral-600')}>
          {tier}
        </span>
      );
    },
  },
  {
    id: 'isManaged',
    header: 'Managed',
    accessorKey: 'isManaged',
    cell: ({ getValue }) =>
      getValue<boolean>() ? (
        <span className="badge-success">Managed</span>
      ) : (
        <span className="badge bg-neutral-100 text-neutral-500">Unmanaged</span>
      ),
  },
  {
    id: 'region',
    header: 'Region',
    accessorKey: 'region',
    cell: ({ getValue }) => (
      <span className="text-neutral-500 text-xs">{getValue<string>()}</span>
    ),
  },
  {
    id: 'netRevenueMTD',
    header: 'Net Rev MTD',
    accessorKey: 'netRevenueMTD',
    cell: ({ getValue }) => {
      const v = getValue<number | undefined>();
      return v != null ? (
        <span className="font-semibold text-neutral-800">{formatCurrency(v, 'USD', true)}</span>
      ) : (
        <span className="text-neutral-300">—</span>
      );
    },
  },
  {
    id: 'tpvAmount',
    header: 'TPV',
    accessorKey: 'tpvAmount',
    cell: ({ getValue }) => {
      const v = getValue<number | undefined>();
      return v != null ? formatCurrency(v, 'USD', true) : <span className="text-neutral-300">—</span>;
    },
  },
  {
    id: 'vampRatio',
    header: 'VAMP Ratio',
    accessorKey: 'vampRatio',
    cell: ({ getValue }) => {
      const v = getValue<number | undefined>();
      if (v == null) return <span className="text-neutral-300">—</span>;
      const isHigh = v > 0.009; // >0.9% is considered elevated
      return (
        <span className={cn('font-medium text-xs', isHigh ? 'text-danger-600' : 'text-neutral-600')}>
          {formatPct(v, 3)}
        </span>
      );
    },
  },
  {
    id: 'goLiveDate',
    header: 'Go-Live',
    accessorKey: 'goLiveDate',
    cell: ({ getValue }) => {
      const v = getValue<string | null>();
      return v ? (
        <span className="text-neutral-500 text-xs">{formatShortDate(v)}</span>
      ) : (
        <span className="text-neutral-300">—</span>
      );
    },
  },
  {
    id: 'salesRepId',
    header: 'Rep',
    accessorKey: 'salesRepId',
    cell: ({ getValue }) => (
      <span className="text-neutral-500 text-xs">{getValue<string>()}</span>
    ),
  },
];

export function BackbookAccount({ filters }: BackbookAccountProps) {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchBackbook(filters)
      .then((data) => setAccounts(data as AccountRow[]))
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [filters]);

  const managedCount = accounts.filter((a) => a.isManaged).length;
  const unmanagedCount = accounts.length - managedCount;
  const managedRevenue = accounts
    .filter((a) => a.isManaged)
    .reduce((s, a) => s + (a.netRevenueMTD ?? 0), 0);
  const unmanagedRevenue = accounts
    .filter((a) => !a.isManaged)
    .reduce((s, a) => s + (a.netRevenueMTD ?? 0), 0);

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
