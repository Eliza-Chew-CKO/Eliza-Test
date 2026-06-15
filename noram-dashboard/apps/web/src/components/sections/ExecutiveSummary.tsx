'use client';

import { useState, useEffect } from 'react';
import KPICard from '@/components/kpi/KPICard';
import { fetchKPISummary } from '@/lib/api';
import { getRunRateFromDate } from '@/lib/utils';
import type { DashboardFilters, KPISummary } from '@/types';

interface ExecutiveSummaryProps {
  filters: DashboardFilters;
}

export default function ExecutiveSummary({ filters }: ExecutiveSummaryProps) {
  const [data, setData] = useState<KPISummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const summary = await fetchKPISummary(filters);
        if (!cancelled) setData(summary);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load KPI summary');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [filters]);

  const runRate = data
    ? getRunRateFromDate(data.netRevenue)
    : undefined;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Executive Summary</h2>
        <p className="text-sm text-neutral-500">
          High-level KPIs for the selected period. Data refreshed daily.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KPICard
          title="Net Revenue"
          value={data?.netRevenue ?? 0}
          target={data?.netRevenueTarget}
          formatAs="currency"
          subtitle={runRate ? `Run rate: ${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact'}).format(runRate)}` : undefined}
          isLoading={isLoading}
        />
        <KPICard
          title="Frontbook MNR"
          value={data?.frontbookMNR ?? 0}
          target={data?.frontbookTarget}
          formatAs="currency"
          isLoading={isLoading}
        />
        <KPICard
          title="Backbook Revenue"
          value={data?.backbookRevenue ?? 0}
          formatAs="currency"
          isLoading={isLoading}
        />
        <KPICard
          title="TPV"
          value={data?.tpvAmount ?? 0}
          formatAs="currency"
          subtitle="Total processed volume"
          isLoading={isLoading}
        />
        <KPICard
          title="Go-Live Count"
          value={data?.goLiveCount ?? 0}
          formatAs="number"
          subtitle="Accounts live this period"
          isLoading={isLoading}
        />
        <KPICard
          title="Avg VAMP Ratio"
          value={data?.vampRatioAvg ?? 0}
          formatAs="percent"
          subtitle="Lower is better"
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}
