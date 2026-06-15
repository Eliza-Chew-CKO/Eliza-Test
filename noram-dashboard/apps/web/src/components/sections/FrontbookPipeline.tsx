'use client';

import { useState, useEffect, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import FunnelChart from '@/components/charts/FunnelChart';
import DataTable from '@/components/tables/DataTable';
import { fetchPipeline } from '@/lib/api';
import { formatCurrency, formatMonth } from '@/lib/utils';
import type { DashboardFilters, Opportunity } from '@/types';

interface FrontbookPipelineProps {
  filters: DashboardFilters;
}

const PIPELINE_STAGES = ['Discovery', 'Scoping', 'Proposal', 'Negotiation', 'Closed Won'];

function buildFunnelData(opps: Opportunity[]) {
  return PIPELINE_STAGES.map((stage) => {
    const stageOpps = opps.filter((o) => o.stage === stage);
    return {
      stage,
      count: stageOpps.length,
      value: stageOpps.reduce((sum, o) => sum + o.weightedExpectedMNR, 0),
    };
  });
}

export default function FrontbookPipeline({ filters }: FrontbookPipelineProps) {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchPipeline(filters);
        if (!cancelled) setOpps(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load pipeline');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [filters]);

  const funnelData = useMemo(() => buildFunnelData(opps), [opps]);

  const columns = useMemo<ColumnDef<Opportunity, unknown>[]>(
    () => [
      {
        id: 'accountId',
        header: 'Account',
        accessorKey: 'accountId',
        cell: ({ getValue }) => (
          <span className="font-medium text-neutral-900">{getValue() as string}</span>
        ),
      },
      {
        id: 'stage',
        header: 'Stage',
        accessorKey: 'stage',
        cell: ({ getValue }) => {
          const stage = getValue() as string;
          const colorMap: Record<string, string> = {
            'Discovery':   'bg-blue-50 text-blue-700',
            'Scoping':     'bg-indigo-50 text-indigo-700',
            'Proposal':    'bg-purple-50 text-purple-700',
            'Negotiation': 'bg-warning-50 text-warning-700',
            'Closed Won':  'bg-success-50 text-success-700',
            'Closed Lost': 'bg-danger-50 text-danger-700',
          };
          return (
            <span className={`badge ${colorMap[stage] ?? 'bg-neutral-100 text-neutral-600'}`}>
              {stage}
            </span>
          );
        },
      },
      {
        id: 'type',
        header: 'Type',
        accessorKey: 'type',
        cell: ({ getValue }) => <span className="text-xs text-neutral-600">{getValue() as string}</span>,
      },
      {
        id: 'baseMonthlyRevenue',
        header: 'Base MNR',
        accessorKey: 'baseMonthlyRevenue',
        cell: ({ getValue }) => (
          <span className="tabular-nums">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'rollMonthlyRevenue',
        header: 'Roll MNR',
        accessorKey: 'rollMonthlyRevenue',
        cell: ({ getValue }) => (
          <span className="tabular-nums">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'weightedExpectedMNR',
        header: 'Weighted MNR',
        accessorKey: 'weightedExpectedMNR',
        cell: ({ getValue }) => (
          <span className="font-medium tabular-nums text-primary-700">
            {formatCurrency(getValue() as number)}
          </span>
        ),
      },
      {
        id: 'closeDate',
        header: 'Close Date',
        accessorKey: 'closeDate',
        cell: ({ getValue }) => (
          <span className="text-xs text-neutral-500">{formatMonth(getValue() as string)}</span>
        ),
      },
      {
        id: 'rating',
        header: 'Rating',
        accessorKey: 'rating',
        cell: ({ getValue }) => <span className="text-xs">{(getValue() as string) ?? '—'}</span>,
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
        <h2 className="text-lg font-semibold text-neutral-900">Frontbook Pipeline</h2>
        <p className="text-sm text-neutral-500">
          Open opportunities by stage, deal value, and rep ownership.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline funnel */}
        <div className="card lg:col-span-1">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700">Pipeline Funnel</h3>
          {isLoading ? (
            <div className="skeleton h-72 w-full rounded-lg" />
          ) : (
            <FunnelChart data={funnelData} height={288} />
          )}
        </div>

        {/* Stage summary */}
        <div className="card lg:col-span-2 flex flex-col gap-2">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">Stage Breakdown</h3>
          {isLoading ? (
            <div className="space-y-2">
              {PIPELINE_STAGES.map((s) => (
                <div key={s} className="skeleton h-6 w-full rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {funnelData.map((stage) => (
                <div key={stage.stage} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700 font-medium">{stage.stage}</span>
                  <div className="flex gap-6">
                    <span className="tabular-nums text-neutral-500">
                      {stage.count} deal{stage.count !== 1 ? 's' : ''}
                    </span>
                    <span className="tabular-nums font-medium text-neutral-800">
                      {formatCurrency(stage.value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Opportunities table */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-neutral-700">Open Opportunities</h3>
        <DataTable data={opps} columns={columns} isLoading={isLoading} pageSize={10} />
      </div>
    </section>
  );
}
