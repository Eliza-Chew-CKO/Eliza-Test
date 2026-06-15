'use client';

import { useState, useEffect } from 'react';
import type { DashboardFilters, LeaderboardEntry, User } from '@/types';
import { fetchLeaderboard } from '@/lib/api';
import { LeaderboardTable } from '@/components/tables/LeaderboardTable';
import { cn } from '@/lib/utils';

interface LeaderboardsProps {
  filters: DashboardFilters;
}

type LeaderboardTab = 'revenue' | 'deals';

export function Leaderboards({ filters }: LeaderboardsProps) {
  const [rawData, setRawData] = useState<{ rep: User; revenue: number; deals: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('revenue');

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchLeaderboard(filters)
      .then(setRawData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [filters]);

  // Sort by revenue descending and assign ranks
  const byRevenue: LeaderboardEntry[] = [...rawData]
    .sort((a, b) => b.revenue - a.revenue)
    .map((item, i) => ({
      rank: i + 1,
      ...item,
      target: item.revenue * 0.9, // placeholder target until API returns per-rep targets
    }));

  // Sort by deals closed descending and assign ranks
  const byDeals: LeaderboardEntry[] = [...rawData]
    .sort((a, b) => b.deals - a.deals)
    .map((item, i) => ({
      rank: i + 1,
      ...item,
      target: item.revenue * 0.9,
    }));

  const displayData = activeTab === 'revenue' ? byRevenue : byDeals;

  return (
    <section aria-labelledby="leaderboards-heading">
      <div className="mb-4">
        <h2 id="leaderboards-heading" className="text-base font-semibold text-neutral-900">
          Leaderboards
        </h2>
        <p className="text-sm text-neutral-500 mt-0.5">
          Rep performance rankings for the selected period
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 mb-4">
          Failed to load leaderboard: {error}
        </div>
      )}

      <div className="card">
        {/* Tab toggle */}
        <div className="flex items-center gap-1 mb-5 border-b border-neutral-200 pb-4">
          <span className="text-sm font-medium text-neutral-500 mr-3">Rank by:</span>
          {(
            [
              { value: 'revenue', label: 'Revenue' },
              { value: 'deals', label: 'Deals Closed' },
            ] as { value: LeaderboardTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab.value
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <LeaderboardTable data={displayData} isLoading={isLoading} />
      </div>
    </section>
  );
}
