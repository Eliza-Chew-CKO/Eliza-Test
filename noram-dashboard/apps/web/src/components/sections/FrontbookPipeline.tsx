'use client';

import { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { DashboardFilters, Opportunity } from '@/types';
import { fetchPipeline } from '@/lib/api';
import FunnelChart from '@/components/charts/FunnelChart';
import { DataTable } from '@/components/tables/DataTable';
import { formatCurrency, formatShortDate, cn } from '@/lib/utils';

interface FrontbookPipelineProps {
  filters: DashboardFilters;
}

// Ordered pipeline stages for funnel calculation
const PIPELINE_STAGES = [
  'Discovery',
  'Scoping',
  'Proposal',
  'Negotiation',
  'Closed Won',
];

const STAGE_COLORS: Record<string, string> = {
  Discovery:   'bg-primary-100 text-primary-700',
  Scoping:     'bg-blue-100 text-blue-700',
  Proposal:    'bg-purple-100 text-purple-700',
  Negotiation: 'bg-warning-100 text-warning-700',
  'Closed Won': 'bg-success-100 text-success-700',
  'Closed Lost': 'bg-danger-100 text-danger-700',
};

const columns: ColumnDef<Opportunity, any>[] = [
  {
    id: 'accountId',
    header: 'Account',
    accessorKey: 'accountId',
    cell: ({ getValue }) => (
      <span className="font-medium text-neutral-800">{getValue<string>()}</span>
    ),
  },
  {
    id: 'stage',
    header: 'Stage',
    accessorKey: 'stage',
    cell: ({ getValue }) => {
      const stage = getValue<string>();
      return (
        <span className={cn('badge', STAGE_COLORS[stage] ?? 'bg-neutral-100 text-neutral-600')}>
          {stage}
        </span>
      );
    },
  },
  {
    id: 'type',
    header: 'Type',
    accessorKey: 'type',
    cell: ({ getValue }) => (
      <span className="text-neutral-600 text-xs">{getValue<string>()}</span>
    ),
  },
  {
    id: 'baseMNR',
    header: 'Base MNR',
    accessorKey: 'baseMonthlyRevenue',
    cell: ({ getValue }) => formatCurrency(getValue<number>(), 'USD', true),
  },
  {
    id: 'rollMNR',
    header: 'Roll MNR',
    accessorKey: 'rollMonthlyRevenue',
    cell: ({ getValue }) => formatCurrency(getValue<number>(), 'USD', true),
  },
  {
    id: 'weightedMNR',
    header: 'Weighted MNR',
    accessorKey: 'weightedExpectedMNR',
    cell: ({ getValue }) => (
      <span className="font-semibold text-neutral-800">
        {formatCurrency(getValue<number>(), 'USD', true)}
      </span>
    ),
  },
  {
    id: 'closeDate',
    header: 'Close Date',
    accessorKey: 'closeDate',
    cell: ({ getValue }) => (
      <span className="text-neutral-500 text-xs">{formatShortDate(getValue<string>())}</span>
    ),
  },
  {
    id: 'rating',
    header: 'Rating',
    accessorKey: 'rating',
    cell: ({ getValue }) => {
      const v = getValue<string | null>();
      return v ? <span className="text-neutral-600 text-xs">{v}</span> : <span className="text-neutral-300">—</span>;
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

export function FrontbookPipeline({ filters }: FrontbookPipelineProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchPipeline(filters)
      .then(setOpportunities)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [filters]);

  // Build funnel data from live opportunities
  const funnelData = PIPELINE_STAGES.map((stage) => {
    const stageOpps = opportunities.filter((o) => o.stage === stage);
    return {
      stage,
      count: stageOpps.length,
      value: stageOpps.reduce((sum, o) => sum + o.weightedExpectedMNR, 0),
    };
  });

  return (
    <section aria-labelledby="pipeline-heading">
      <div className="mb-4">
        <h2 id="pipeline-heading" className="text-base font-semibold text-neutral-900">
          Frontbook Pipeline
        </h2>
        <p className="text-sm text-neutral-500 mt-0.5">
          Open opportunities by stage — weighted MNR and deal count
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 mb-4">
          Failed to load pipeline: {error}
        </div>
      )}

      {/* Funnel chart */}
      <div className="card mb-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Pipeline Funnel</h3>
        {isLoading ? (
          <div className="skeleton h-72 rounded-lg w-full" />
        ) : (
          <FunnelChart data={funnelData} height={280} />
        )}
      </div>

      {/* Opportunity table */}
      <div className="card">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Open Opportunities</h3>
        <DataTable
          data={opportunities}
          columns={columns}
          isLoading={isLoading}
          pageSize={10}
        />
      </div>
    </section>
  );
}
