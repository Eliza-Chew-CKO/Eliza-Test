'use client';

import { useState, useEffect } from 'react';
import type { DashboardFilters, MonthlyPoint, TPVPoint } from '@/types';
import { fetchFrontbookTrend, fetchBackbookTrend, fetchTPVByMonth } from '@/lib/api';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';

interface FinancialTrendsProps {
  filters: DashboardFilters;
}

interface CombinedPoint {
  month: string;
  fbActual: number;
  bbActual: number;
  cumulFB: number;
  cumulRoll: number | null;
  tpv: number;
}

export function FinancialTrends({ filters }: FinancialTrendsProps) {
  const [combined, setCombined] = useState<CombinedPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      fetchFrontbookTrend(filters),
      fetchBackbookTrend(filters),
      fetchTPVByMonth(filters),
    ])
      .then(([fb, bb, tpv]) => {
        const tpvMap = new Map<string, number>(tpv.map(t => [t.isoMonth, t.volume]));
        const bbMap = new Map<string, MonthlyPoint>(bb.map(p => [p.isoMonth, p]));
        setCombined(
          fb.map(p => ({
            month: p.month,
            fbActual: p.actual,
            bbActual: bbMap.get(p.isoMonth)?.actual ?? 0,
            cumulFB: p.cumulActual,
            cumulRoll: p.cumulRoll,
            tpv: tpvMap.get(p.isoMonth) ?? 0,
          })),
        );
      })
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
        {/* Cumulative Frontbook NR vs roll target */}
        <div className="card">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-neutral-700">Cumulative Frontbook NR vs Target</h3>
            <p className="text-xs text-neutral-400 mt-0.5">YTD cumulative vs roll target</p>
          </div>
          {isLoading ? (
            <div className="skeleton h-64 rounded-lg w-full" />
          ) : (
            <LineChart
              data={combined}
              lines={[
                { key: 'cumulFB', color: '#0070f3', label: 'Cumulative FB NR' },
                { key: 'cumulRoll', color: '#10b981', label: 'Roll Target' },
              ]}
              height={260}
            />
          )}
        </div>

        {/* FB + BB actuals stacked + TPV bar */}
        <div className="card">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-neutral-700">Monthly Revenue by Book</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Frontbook and backbook net revenue</p>
          </div>
          {isLoading ? (
            <div className="skeleton h-64 rounded-lg w-full" />
          ) : (
            <BarChart
              data={combined}
              bars={[
                { key: 'fbActual', color: '#0070f3', label: 'Frontbook NR' },
                { key: 'bbActual', color: '#8b5cf6', label: 'Backbook NR' },
              ]}
              stacked
              height={260}
            />
          )}
        </div>

        {/* TPV by month */}
        <div className="card lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-neutral-700">US BIN TPV by Month</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Total payment volume processed</p>
          </div>
          {isLoading ? (
            <div className="skeleton h-56 rounded-lg w-full" />
          ) : (
            <BarChart
              data={combined}
              bars={[{ key: 'tpv', color: '#f59e0b', label: 'TPV' }]}
              height={220}
            />
          )}
        </div>
      </div>
    </section>
  );
}
