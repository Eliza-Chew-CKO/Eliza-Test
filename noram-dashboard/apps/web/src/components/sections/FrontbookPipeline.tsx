'use client';

import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { DashboardFilters, Opportunity } from '@/types';
import { fetchPipeline } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import FunnelChart from '@/components/charts/FunnelChart';
import DataTable from '@/components/tables/DataTable';

interface FrontbookPipelineProps {
  filters: DashboardFilters;
}

const PIPELINE_STAGES = ['Discovery', 'Scoping', 'Proposal', 'Negotiation', 'Closed Won'];

const STAGE_COLORS: Record<string, string> = {
  Discovery:    'bg-blue-50 text-blue-700',
  Scoping:      'bg-indigo-50 text-indigo-700',
  Proposal:     'bg-purple-50 text-purple-700',
  Negotiation:  'bg-warning-50 text-warning-700',
  'Closed Won': 'bg-success-50 text-success-700',
};

const columns: ColumnDef<Opportunity>[] = [
  {
    id: 'accountId',
    header: 'Account',
    accessorKey: 'accountId',
    cell: ({ getValue }) => (
      <span className="font-medium text-neutral-900">{getValue<string>()}</span>
    ),
  },
  {
    id: 'stage',
    header: 'Stage',
    accessorKey: 'stage',
    cell: ({ getValue }) => {
      const stage = getValue<string>();
      return (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[stage] ?? 'bg-neutral-100 text-neutral-600'}`}>
          {stage}
        </span>
      );
    },
  },
  {
    id: 'type',
    header: 'Type',
    accessorKey: 'type',
  },
  {
    id: 'baseMonthlyRevenue',
    header: 'Base MNR',
    accessorKey: 'baseMonthlyRevenue',
    cell: ({ getValue }) => formatCurrency(getValue<number>()),
  },
  {
    id: 'rollMonthlyRevenue',
    header: 'Roll MNR',
    accessorKey: 'rollMonthlyRevenue',
    cell: ({ getValue }) => formatCurrency(getValue<number>()),
  },
  {
    id: 'weightedExpectedMNR',
    header: 'Weighted MNR',
    accessorKey: 'weightedExpectedMNR',
    cell: ({ getValue }) => (
      <span className="font-medium">{formatCurrency(getValue<number>())}</span>
    ),
  },
  {
    id: 'closeDate',
    header: 'Close Date',
    accessorKey: 'closeDate',
    cell: ({ getValue }) => formatDate(getValue<string>()),
  },
  {
    id: 'rating',
    header: 'Rating',
    accessorKey: 'rating',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    id: 'salesRepId',
    header: 'Rep',
    accessorKey: 'salesRepId',
  },
];

export default function FrontbookPipeline({ filters }: FrontbookPipelineProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetchPipeline(filters)
      .then((data) => {
        if (!cancelled) {
          setOpportunities(data);
          setIsLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [filters]);

  // Build funnel data from pipeline
  const funnelData = PIPELINE_STAGES.map((stage) => {
    const stageOpps = opportunities.filter((o) => o.stage === stage);
    return {
      stage,
      count: stageOpps.length,
      value: stageOpps.reduce((sum, o) => sum + o.weightedExpectedMNR, 0),
    };
  });

  return (
    <section>
      <div className="mb-4">
        <h2 className="section-title">Frontbook Pipeline</h2>
        <p className="section-description">
          Open opportunities by stage and weighted monthly new revenue (MNR).
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline funnel */}
        <div className="card lg:col-span-1">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700">
            Pipeline by Stage
          </h3>
          {isLoading ? (
            <div className="skeleton h-72 w-full" />
          ) : (
            <FunnelChart data={funnelData} height={320} />
          )}
        </div>

        {/* Stage summary */}
        <div className="card lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700">
            Stage Summary
          </h3>
          <div className="space-y-3">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-8 w-full" />
                ))
              : funnelData.map((stage) => (
                  <div key={stage.stage} className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-2.5">
                    <span className="text-sm font-medium text-neutral-700">{stage.stage}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-neutral-400">{stage.count} deals</span>
                      <span className="text-sm font-semibold text-neutral-900">
                        {formatCurrency(stage.value)}
                      </span>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* Opportunities table */}
      <div className="card p-0">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-neutral-700">Open Opportunities</h3>
        </div>
        <DataTable
          data={opportunities}
          columns={columns}
          isLoading={isLoading}
          pageSize={8}
        />
      </div>
    </section>
  );
}
