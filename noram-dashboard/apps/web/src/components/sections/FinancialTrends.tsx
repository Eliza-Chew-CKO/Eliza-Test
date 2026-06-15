'use client';

import { useState, useEffect } from 'react';
import type { DashboardFilters, TrendDataPoint } from '@/types';
import { fetchFinancialTrends } from '@/lib/api';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';

interface FinancialTrendsProps {
  filters: DashboardFilters;
}

export function FinancialTrends({ filters }: FinancialTrendsProps) {
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchFinancialTrends(filters)
      .then(setTrendData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [filters]);

  return (
    <section aria-labelledby="financial-trends-heading">
      <div className="mb-4">
        <h2 id="financial-trends-heading" className="text-base font-semibold text-neutral-900">
          Financial Trends
        </h2>
        <p className="text-sm text-neutral-500 mt-0.5">
          Monthly revenue actuals vs targets, and TPV over time
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 mb-4">
          Failed to load financial trends: {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Revenue actuals vs targets line chart */}
        <div className="card">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-neutral-700">Revenue Actuals vs Target</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Net revenue per month</p>
          </div>
          {isLoading ? (
            <div className="skeleton h-64 rounded-lg w-full" />
          ) : (
            <LineChart
              data={trendData}
              lines={[
                { key: 'actual', color: '#0070f3', label: 'Actual Revenue' },
                { key: 'target', color: '#10b981', label: 'Target' },
              ]}
              height={260}
            />
          )}
        </div>

        {/* TPV by month bar chart */}
        <div className="card">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-neutral-700">TPV by Month</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Total payment volume processed</p>
          </div>
          {isLoading ? (
            <div className="skeleton h-64 rounded-lg w-full" />
          ) : (
            <BarChart
              data={trendData}
              bars={[
                { key: 'tpv', color: '#8b5cf6', label: 'TPV' },
              ]}
              height={260}
            />
          )}
        </div>
      </div>
    </section>
  );
}
