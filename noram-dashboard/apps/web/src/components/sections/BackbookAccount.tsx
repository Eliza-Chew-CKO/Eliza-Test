'use client';

import { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { DashboardFilters, Account } from '@/types';
import { fetchBackbook } from '@/lib/api';
import { formatCurrency, formatPct } from '@/lib/utils';
import KPICard from '@/components/kpi/KPICard';
import DataTable from '@/components/tables/DataTable';

interface BackbookAccountProps {
  filters: DashboardFilters;
}

interface AccountRow extends Account {
  netRevenueMTD?: number;
  tpvAmount?: number;
  vampRatio?: number;
}

const columns: ColumnDef<AccountRow>[] = [
  {
    accessorKey: 'alias',
    header: 'Account',
    cell: ({ getValue }) => (
      <span className="font-medium text-neutral-900">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'tier',
    header: 'Tier',
    cell: ({ getValue }) => {
      const tier = getValue<string>();
      const colors: Record<string, string> = {
        Enterprise: 'bg-purple-50 text-purple-700',
        'Mid-Market': 'bg-blue-50 text-blue-700',
        SMB: 'bg-green-50 text-green-700',
      };
      return (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[tier] ?? 'bg-neutral-100 text-neutral-600'}`}>
          {tier}
        </span>
      );
    },
  },
  {
    accessorKey: 'isManaged',
    header: 'Managed',
    cell: ({ getValue }) => (
      <span className={getValue<boolean>() ? 'text-success-600 font-medium' : 'text-neutral-400'}>
        {getValue<boolean>() ? 'Yes' : 'No'}
      </span>
    ),
  },
  {
    accessorKey: 'region',
    header: 'Region',
  },
  {
    accessorKey: 'netRevenueMTD',
    header: 'Net Revenue MTD',
    cell: ({ getValue }) => {
      const v = getValue<number | undefined>();
      return v != null ? formatCurrency(v) : '—';
    },
  },
  {
    accessorKey: 'tpvAmount',
    header: 'TPV',
    cell: ({ getValue }) => {
      const v = getValue<number | undefined>();
      return v != null ? formatCurrency(v) : '—';
    },
  },
  {
    accessorKey: 'vampRatio',
    header: 'VAMP Ratio',
    cell: ({ getValue }) => {
      const v = getValue<number | undefined>();
      if (v == null) return '—';
      const isHigh = v > 0.005;
      return (
        <span className={isHigh ? 'font-semibold text-danger-600' : 'text-neutral-700'}>
          {formatPct(v * 100, 3)}
        </span>
      );
    },
  },
  {
    accessorKey: 'goLiveDate',
    header: 'Go-Live',
    cell: ({ getValue }) => {
      const v = getValue<string | null>();
      return v ? new Date(v).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
    },
  },
  {
    accessorKey: 'salesRepId',
    header: 'Rep',
  },
];

export default function BackbookAccount({ filters }: BackbookAccountProps) {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchBackbook(filters)
      .then((data) => {
        if (!cancelled) {
          setAccounts(data as AccountRow[]);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load backbook accounts');
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [filters]);

  const managedCount = accounts.filter((a) => a.isManaged).length;
  const unmanagedCount = accounts.length - managedCount;
  const managedRevenue = accounts
    .filter((a) => a.isManaged)
    .reduce((sum, a) => sum + (a.netRevenueMTD ?? 0), 0);
  const unmanagedRevenue = accounts
    .filter((a) => !a.isManaged)
    .reduce((sum, a) => sum + (a.netRevenueMTD ?? 0), 0);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Backbook Accounts</h2>
        <p className="text-sm text-neutral-500">
          Existing account revenue, TPV, and VAMP performance by tier and rep.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* Managed / Unmanaged KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Managed Accounts"
          value={managedCount}
          formatAs="number"
          subtitle="With assigned AM"
          isLoading={isLoading}
        />
        <KPICard
          title="Unmanaged Accounts"
          value={unmanagedCount}
          formatAs="number"
          subtitle="No assigned AM"
          isLoading={isLoading}
        />
        <KPICard
          title="Managed Revenue"
          value={managedRevenue}
          formatAs="currency"
          isLoading={isLoading}
        />
        <KPICard
          title="Unmanaged Revenue"
          value={unmanagedRevenue}
          formatAs="currency"
          isLoading={isLoading}
        />
      </div>

      {/* Account table */}
      <DataTable
        data={accounts}
        columns={columns}
        isLoading={isLoading}
        pageSize={10}
      />
    </section>
  );
}
