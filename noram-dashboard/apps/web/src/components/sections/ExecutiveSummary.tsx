'use client';

import { useEffect, useState } from 'react';
import type { DashboardFilters, KPISummary } from '@/types';
import { fetchKPISummary } from '@/lib/api';
import { getRunRate, formatPct } from '@/lib/utils';
import KPICard from '@/components/kpi/KPICard';

interface ExecutiveSummaryProps {
  filters: DashboardFilters;
}

export default function ExecutiveSummary({ filters }: ExecutiveSummaryProps) {
  const [kpis, setKpis] = useState<KPISummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchKPISummary(filters)
      .then((data) => {
        if (!cancelled) {
          setKpis(data);
          setIsLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load KPI data');
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [filters]);

  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const runRateRevenue = kpis
    ? getRunRate(kpis.netRevenue, dayOfMonth, daysInMonth)
    : 0;

  return (
    <section>
      <div className="mb-4">
        <h2 className="section-title">Executive Summary</h2>
        <p className="section-description">
          Key performance indicators for the selected period.
          {filters.dateRange === 'MTD' && (
            <span className="ml-1 text-neutral-400">
              Run rate based on day {dayOfMonth} of {daysInMonth}.
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard
          title="Net Revenue"
          value={kpis?.netRevenue ?? 0}
          target={kpis?.netRevenueTarget}
          formatAs="currency"
          subtitle={
            filters.dateRange === 'MTD'
              ? `Run rate: $${(runRateRevenue / 1_000).toFixed(0)}K`
              : undefined
          }
          isLoading={isLoading}
        />
        <KPICard
          title="Frontbook MNR"
          value={kpis?.frontbookMNR ?? 0}
          target={kpis?.frontbookTarget}
          formatAs="currency"
          isLoading={isLoading}
        />
        <KPICard
          title="Backbook Revenue"
          value={kpis?.backbookRevenue ?? 0}
          formatAs="currency"
          isLoading={isLoading}
        />
        <KPICard
          title="TPV"
          value={kpis?.tpvAmount ?? 0}
          formatAs="currency"
          subtitle="Total payment volume"
          isLoading={isLoading}
        />
        <KPICard
          title="Go-Lives"
          value={kpis?.goLiveCount ?? 0}
          formatAs="number"
          subtitle="Accounts live this period"
          isLoading={isLoading}
        />
        <KPICard
          title="VAMP Ratio"
          value={kpis?.vampRatio ?? 0}
          formatAs="percent"
          subtitle="Fraud events / captured events"
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}
