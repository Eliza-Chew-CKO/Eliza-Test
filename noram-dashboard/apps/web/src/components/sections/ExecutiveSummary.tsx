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
      .then((summary) => {
        setData(summary);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <KPICard
          title="Net Revenue"
          value={data?.netRevenue ?? 0}
          target={data?.netRevenueTarget}
          formatAs="currency"
          subtitle="Total net revenue in period"
          isLoading={isLoading}
        />
        <KPICard
          title="Frontbook MNR"
          value={data?.frontbookMNR ?? 0}
          target={data?.frontbookTarget}
          formatAs="currency"
          subtitle="Monthly net revenue from new logos"
          isLoading={isLoading}
        />
        <KPICard
          title="Backbook Revenue"
          value={data?.backbookRevenue ?? 0}
          formatAs="currency"
          subtitle="Revenue from existing accounts"
          isLoading={isLoading}
        />
        <KPICard
          title="TPV"
          value={data?.tpvAmount ?? 0}
          formatAs="currency"
          subtitle="Total payment volume processed"
          isLoading={isLoading}
        />
        <KPICard
          title="Go-Lives"
          value={data?.goLiveCount ?? 0}
          formatAs="number"
          subtitle="Accounts gone live this period"
          isLoading={isLoading}
        />
        <KPICard
          title="VAMP Ratio"
          value={data?.vampRatio != null ? data.vampRatio * 100 : 0}
          formatAs="percent"
          suffix="%"
          subtitle="Avg fraud ratio across accounts"
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}
