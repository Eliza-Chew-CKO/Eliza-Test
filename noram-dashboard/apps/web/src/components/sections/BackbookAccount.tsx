'use client';

import { useState, useEffect, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import KPICard from '@/components/kpi/KPICard';
import DataTable from '@/components/tables/DataTable';
import { fetchBackbook } from '@/lib/api';
import { formatCurrency, formatMonth } from '@/lib/utils';
import type { DashboardFilters, Account } from '@/types';

interface BackbookAccountProps {
  filters: DashboardFilters;
}

export default function BackbookAccount({ filters }: BackbookAccountProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchBackbook(filters);
        if (!cancelled) setAccounts(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load backbook accounts');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [filters]);

  const managed = accounts.filter((a) => a.isManaged);
  const unmanaged = accounts.filter((a) => !a.isManaged);

  const columns = useMemo<ColumnDef<Account, unknown>[]>(
    () => [
      {
        id: 'alias',
        header: 'Account',
        accessorKey: 'alias',
        cell: ({ getValue }) => (
          <span className="font-medium text-neutral-900">{getValue() as string}</span>
        ),
      },
      {
        id: 'tier',
        header: 'Tier',
        accessorKey: 'tier',
        cell: ({ getValue }) => {
          const tier = getValue() as string;
          const colorMap: Record<string, string> = {
            Enterprise:   'bg-primary-50 text-primary-700',
            'Mid-Market': 'bg-purple-50 text-purple-700',
            SMB:          'bg-neutral-100 text-neutral-600',
          };
          return (
            <span className={`badge ${colorMap[tier] ?? 'bg-neutral-100 text-neutral-600'}`}>
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
          getValue() ? (
            <span className="badge badge-success">Managed</span>
          ) : (
            <span className="badge bg-neutral-100 text-neutral-500">Unmanaged</span>
          ),
      },
      {
        id: 'region',
        header: 'Region',
        accessorKey: 'region',
        cell: ({ getValue }) => <span className="text-xs text-neutral-600">{getValue() as string}</span>,
      },
      {
        id: 'netRevenueMTD',
        header: 'Net Rev MTD',
        // This would be joined from FinancialActual in the actual API response
        accessorFn: () => 0,
        cell: () => <span className="tabular-nums text-neutral-400">—</span>,
      },
      {
        id: 'tpvAmount',
        header: 'TPV',
        accessorFn: () => 0,
        cell: () => <span className="tabular-nums text-neutral-400">—</span>,
      },
      {
        id: 'vampRatio',
        header: 'VAMP Ratio',
        accessorFn: () => null,
        cell: () => <span className="text-neutral-400">—</span>,
      },
      {
        id: 'goLiveDate',
        header: 'Go-Live',
        accessorKey: 'goLiveDate',
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          return v ? (
            <span className="text-xs text-neutral-500">{formatMonth(v)}</span>
          ) : (
            <span className="text-neutral-300">—</span>
          );
        },
      },
      {
        id: 'salesRepId',
        header: 'Rep',
        accessorKey: 'salesRepId',
        cell: ({ getValue }) => <span className="text-xs text-neutral-500">{getValue() as string}</span>,
      },
    ],
    [],
  );

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Backbook Accounts</h2>
        <p className="text-sm text-neutral-500">
          Live account portfolio — managed vs unmanaged breakdown, revenue, and VAMP health.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* Managed vs unmanaged KPI summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard
          title="Total Accounts"
          value={accounts.length}
          formatAs="number"
          isLoading={isLoading}
        />
        <KPICard
          title="Managed Accounts"
          value={managed.length}
          formatAs="number"
          subtitle={`${accounts.length ? Math.round((managed.length / accounts.length) * 100) : 0}% of portfolio`}
          isLoading={isLoading}
        />
        <KPICard
          title="Unmanaged Accounts"
          value={unmanaged.length}
          formatAs="number"
          isLoading={isLoading}
        />
        <KPICard
          title="Enterprise Accounts"
          value={accounts.filter((a) => a.tier === 'Enterprise').length}
          formatAs="number"
          isLoading={isLoading}
        />
      </div>

      {/* Accounts table */}
      <DataTable data={accounts} columns={columns} isLoading={isLoading} pageSize={15} />
    </section>
  );
}
