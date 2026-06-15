'use client';

import { useEffect, useState } from 'react';
import type { DashboardFilters, FinancialTrendPoint } from '@/types';
import { fetchFinancialTrends } from '@/lib/api';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';

interface FinancialTrendsProps {
  filters: DashboardFilters;
}

export default function FinancialTrends({ filters }: FinancialTrendsProps) {
  const [trends, setTrends] = useState<FinancialTrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchFinancialTrends(filters)
      .then((data) => {
        if (!cancelled) {
          setTrends(data);
          setIsLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load financial trends');
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [filters]);

  return (
    <section>
      <div className="mb-4">
        <h2 className="section-title">Financial Trends</h2>
        <p className="section-description">
          Monthly revenue actuals vs targets and total payment volume (TPV) over time.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue actuals vs targets — line chart */}
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700">
            Net Revenue: Actuals vs Target
          </h3>
          {isLoading ? (
            <div className="skeleton h-72 w-full" />
          ) : (
            <LineChart
              data={trends}
              lines={[
                { key: 'actual', color: '#0070f3', label: 'Actual' },
                { key: 'target', color: '#e5e7eb', label: 'Target' },
              ]}
              height={280}
            />
          )}
        </div>

        {/* TPV by month — bar chart */}
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700">
            Total Payment Volume (TPV) by Month
          </h3>
          {isLoading ? (
            <div className="skeleton h-72 w-full" />
          ) : (
            <BarChart
              data={trends}
              bars={[{ key: 'tpv', color: '#8b5cf6', label: 'TPV' }]}
              height={280}
            />
          )}
        </div>
      </div>
    </section>
  );
}
