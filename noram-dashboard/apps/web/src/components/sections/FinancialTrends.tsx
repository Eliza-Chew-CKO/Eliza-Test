'use client';

import { useState, useEffect } from 'react';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import { fetchFinancialTrends } from '@/lib/api';
import type { DashboardFilters, TrendDataPoint } from '@/types';

interface FinancialTrendsProps {
  filters: DashboardFilters;
}

export default function FinancialTrends({ filters }: FinancialTrendsProps) {
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchFinancialTrends(filters);
        if (!cancelled) setTrends(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load financial trends');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [filters]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Financial Trends</h2>
        <p className="text-sm text-neutral-500">
          Monthly net revenue actuals vs targets and total processed volume over time.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue actuals vs targets line chart */}
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700">
            Revenue Actuals vs Targets
          </h3>
          {isLoading ? (
            <div className="skeleton h-72 w-full rounded-lg" />
          ) : (
            <LineChart
              data={trends}
              lines={[
                { key: 'actual', color: '#0070f3', label: 'Actual' },
                { key: 'target', color: '#d1d5db', label: 'Target' },
              ]}
              height={288}
            />
          )}
        </div>

        {/* TPV by month bar chart */}
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700">
            Total Processed Volume (TPV) by Month
          </h3>
          {isLoading ? (
            <div className="skeleton h-72 w-full rounded-lg" />
          ) : (
            <BarChart
              data={trends}
              bars={[
                { key: 'actual', color: '#0070f3', label: 'TPV' },
              ]}
              height={288}
            />
          )}
        </div>
      </div>
    </section>
  );
}
