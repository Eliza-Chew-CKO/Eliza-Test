'use client';

import { useState, useEffect } from 'react';
import type { DashboardFilters, KPISummary } from '@/types';
import { fetchKPISummary } from '@/lib/api';
import { KPICard } from '@/components/kpi/KPICard';

interface ExecutiveSummaryProps {
  filters: DashboardFilters;
}

export function ExecutiveSummary({ filters }: ExecutiveSummaryProps) {
  const [data, setData] = useState<KPISummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchKPISummary(filters)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [filters]);

  return (
    <section aria-labelledby="executive-summary-heading">
      <div className="mb-4">
        <h2 id="executive-summary-heading" className="text-base font-semibold text-neutral-900">
          Executive Summary
        </h2>
        <p className="text-sm text-neutral-500 mt-0.5">
          Top-level KPIs for the selected period
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 mb-4">
          Failed to load KPIs: {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Total Net Revenue"
          value={data?.totalMR.value ?? 0}
          target={data?.totalMR.target ?? undefined}
          formatAs="currency"
          subtitle={data?.totalMR.yoyPct != null ? `${data.totalMR.yoyPct >= 0 ? '+' : ''}${(data.totalMR.yoyPct * 100).toFixed(1)}% YoY` : 'vs last year'}
          isLoading={isLoading}
        />
        <KPICard
          title="Frontbook NR"
          value={data?.frontbookNR.value ?? 0}
          target={data?.frontbookNR.target ?? undefined}
          formatAs="currency"
          subtitle={data?.frontbookNR.runRate != null ? `Run rate: $${(data.frontbookNR.runRate / 1_000_000).toFixed(1)}M` : 'Monthly net revenue'}
          isLoading={isLoading}
        />
        <KPICard
          title="Backbook NR"
          value={data?.backbookNR.value ?? 0}
          target={data?.backbookNR.target ?? undefined}
          formatAs="currency"
          subtitle={data?.backbookNR.runRate != null ? `Run rate: $${(data.backbookNR.runRate / 1_000_000).toFixed(1)}M` : 'Existing account revenue'}
          isLoading={isLoading}
        />
        <KPICard
          title="US BIN TPV"
          value={data?.usBinTPV.value ?? 0}
          target={data?.usBinTPV.target ?? undefined}
          formatAs="currency"
          subtitle={data?.usBinTPV.yoyPct != null ? `${data.usBinTPV.yoyPct >= 0 ? '+' : ''}${(data.usBinTPV.yoyPct * 100).toFixed(1)}% YoY` : 'Total payment volume'}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}
