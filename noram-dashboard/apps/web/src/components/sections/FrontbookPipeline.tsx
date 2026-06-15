'use client';

import { useEffect, useState } from 'react';
import FunnelChart from '@/components/charts/FunnelChart';
import DataTable from '@/components/tables/DataTable';
import { fetchPipeline } from '@/lib/api';
import { formatCurrency, formatMonth } from '@/lib/utils';
import type { DashboardFilters, Opportunity } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';

interface FrontbookPipelineProps {
  filters: DashboardFilters;
}

// Aggregate opportunities into funnel data by stage
function buildFunnelData(opportunities: Opportunity[]) {
  const STAGES = ['Discovery', 'Scoping', 'Proposal', 'Negotiation', 'Closed Won'];
  return STAGES.map((stage) => {
    const stageOpps = opportunities.filter((o) => o.stage === stage);
    return {
      stage,
      count: stageOpps.length,
      value: stageOpps.reduce((sum, o) => sum + o.weightedExpectedMNR, 0),
    };
  }).filter((d) => d.count > 0);
}

const COLUMNS: ColumnDef<Opportunity>[] = [
  {
    header: 'Account',
    accessorKey: 'accountId',
    cell: ({ getValue }) => (
      <span className="font-medium text-gray-900">{getValue() as string}</span>
    ),
  },
  {
    header: 'Stage',
    accessorKey: 'stage',
    cell: ({ getValue }) => {
      const stage = getValue() as string;
      const colors: Record<string, string> = {
        Discovery: 'bg-purple-100 text-purple-700',
        Scoping: 'bg-blue-100 text-blue-700',
        Proposal: 'bg-cyan-100 text-cyan-700',
        Negotiation: 'bg-amber-100 text-amber-700',
        'Closed Won': 'bg-green-100 text-green-700',
      };
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[stage] ?? 'bg-gray-100 text-gray-600'}`}>
          {stage}
        </span>
      );
    },
  },
  {
    header: 'Type',
    accessorKey: 'type',
  },
  {
    header: 'Base MNR',
    accessorKey: 'baseMonthlyRevenue',
    cell: ({ getValue }) => formatCurrency(getValue() as number),
  },
  {
    header: 'Roll MNR',
    accessorKey: 'rollMonthlyRevenue',
    cell: ({ getValue }) => formatCurrency(getValue() as number),
  },
  {
    header: 'Weighted MNR',
    accessorKey: 'weightedExpectedMNR',
    cell: ({ getValue }) => (
      <span className="font-medium">{formatCurrency(getValue() as number)}</span>
    ),
  },
  {
    header: 'Close Date',
    accessorKey: 'closeDate',
    cell: ({ getValue }) => formatMonth(getValue() as string),
  },
  {
    header: 'Rating',
    accessorKey: 'rating',
    cell: ({ getValue }) => getValue() as string ?? '—',
  },
  {
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
    setError(null);

    fetchPipeline(filters)
      .then((data) => {
        if (!cancelled) {
          setOpportunities(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load pipeline data.');
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [filters]);

  const funnelData = buildFunnelData(opportunities);

  return (
    <section id="frontbook-pipeline" className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Frontbook Pipeline</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Open opportunities by stage with weighted MNR values.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Pipeline by Stage</h3>
          {isLoading ? (
            <div className="h-72 bg-gray-100 animate-pulse rounded-lg" />
          ) : (
            <FunnelChart data={funnelData} height={320} />
          )}
        </div>

        {/* Stage Summary Cards */}
        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
              ))
            : funnelData.map((stage) => (
                <div
                  key={stage.stage}
                  className="flex items-center justify-between bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{stage.stage}</p>
                    <p className="text-xs text-gray-400">{stage.count} deal{stage.count !== 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(stage.value)}
                  </p>
                </div>
              ))}
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Open Opportunities</h3>
        </div>
        <DataTable<Opportunity>
          data={opportunities}
          columns={COLUMNS}
          isLoading={isLoading}
          pageSize={10}
        />
      </div>
    </section>
  );
}
