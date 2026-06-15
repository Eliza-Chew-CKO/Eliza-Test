'use client';

import { useState, useEffect } from 'react';
import type { DashboardFilters, WeightedPipelinePoint, BottleneckMetric, GoLiveTracker } from '@/types';
import { fetchWeightedPipeline, fetchPipelineBottlenecks, fetchGoLiveTracker } from '@/lib/api';
import BarChart from '@/components/charts/BarChart';
import { KPICard } from '@/components/kpi/KPICard';
import { cn } from '@/lib/utils';

interface FrontbookPipelineProps {
  filters: DashboardFilters;
}

const STAGE_COLORS = ['#0070f3', '#8b5cf6', '#f59e0b', '#10b981', '#6366f1'];
const STAGES = ['Explore', 'Propose', 'Trade', 'Handover', 'Live'] as const;

function BottlenecksGrid({ metrics }: { metrics: BottleneckMetric[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200">
            <th className="py-2 text-left font-medium text-neutral-500">Metric</th>
            <th className="py-2 text-right font-medium text-neutral-500">Last 90d</th>
            <th className="py-2 text-right font-medium text-neutral-500">Prior 90d</th>
            <th className="py-2 text-right font-medium text-neutral-500">Change</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => {
            const positive = (m.changePct ?? 0) >= 0;
            return (
              <tr key={m.label} className="border-b border-neutral-100 last:border-0">
                <td className="py-2 font-medium text-neutral-700">{m.label}</td>
                <td className="py-2 text-right text-neutral-800">{m.last90}</td>
                <td className="py-2 text-right text-neutral-500">{m.prior90}</td>
                <td className={cn('py-2 text-right font-semibold text-xs', positive ? 'text-success-600' : 'text-danger-600')}>
                  {m.changePct != null
                    ? `${positive ? '+' : ''}${(m.changePct * 100).toFixed(0)}%`
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function FrontbookPipeline({ filters }: FrontbookPipelineProps) {
  const [pipeline, setPipeline] = useState<WeightedPipelinePoint[]>([]);
  const [bottlenecks, setBottlenecks] = useState<BottleneckMetric[]>([]);
  const [goLives, setGoLives] = useState<GoLiveTracker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      fetchWeightedPipeline(filters),
      fetchPipelineBottlenecks(filters),
      fetchGoLiveTracker(filters),
    ])
      .then(([p, b, g]) => {
        setPipeline(p);
        setBottlenecks(b);
        setGoLives(g);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [filters]);

  return (
    <section aria-labelledby="pipeline-heading">
      <div className="mb-4">
        <h2 id="pipeline-heading" className="text-base font-semibold text-neutral-900">
          Frontbook Pipeline
        </h2>
        <p className="text-sm text-neutral-500 mt-0.5">
          Weighted pipeline by stage over time, activity bottlenecks, and go-live tracker
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 mb-4">
          Failed to load pipeline: {error}
        </div>
      )}

      {/* Weighted pipeline stacked bar */}
      <div className="card mb-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Weighted Pipeline by Stage</h3>
        {isLoading ? (
          <div className="skeleton h-72 rounded-lg w-full" />
        ) : (
          <BarChart
            data={pipeline}
            bars={STAGES.map((s, i) => ({ key: s, color: STAGE_COLORS[i], label: s }))}
            stacked
            height={280}
          />
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Go-live tracker */}
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-700 mb-4">Go-Live Tracker</h3>
          <div className="grid grid-cols-2 gap-4">
            <KPICard
              title="Total Go-Lives"
              value={goLives?.count ?? 0}
              target={goLives?.target ?? undefined}
              formatAs="number"
              subtitle="vs annual target"
              isLoading={isLoading}
            />
            <KPICard
              title="Gold Go-Lives"
              value={goLives?.goldCount ?? 0}
              target={goLives?.goldTarget ?? undefined}
              formatAs="number"
              subtitle="Gold-rated merchants"
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Bottlenecks */}
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-700 mb-4">Pipeline Activity (L90 vs Prior 90d)</h3>
          {isLoading ? (
            <div className="skeleton h-48 rounded-lg w-full" />
          ) : (
            <BottlenecksGrid metrics={bottlenecks} />
          )}
        </div>
      </div>
    </section>
  );
}
