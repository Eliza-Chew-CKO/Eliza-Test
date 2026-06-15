'use client';

import { useEffect, useState } from 'react';
import LeaderboardTable from '@/components/tables/LeaderboardTable';
import { fetchLeaderboard } from '@/lib/api';
import type { DashboardFilters, User } from '@/types';

interface LeaderboardsProps {
  filters: DashboardFilters;
}

interface LeaderboardRow {
  rank: number;
  rep: User;
  revenue: number;
  target: number;
  deals: number;
}

type ActiveTab = 'revenue' | 'deals';

export default function Leaderboards({ filters }: LeaderboardsProps) {
  const [rawData, setRawData] = useState<{ rep: User; revenue: number; deals: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('revenue');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchLeaderboard(filters)
      .then((data) => {
        if (!cancelled) {
          setRawData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load leaderboard data.');
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [filters]);

  // Rank by revenue (descending)
  const byRevenue: LeaderboardRow[] = [...rawData]
    .sort((a, b) => b.revenue - a.revenue)
    .map((d, idx) => ({
      rank: idx + 1,
      rep: d.rep,
      revenue: d.revenue,
      target: d.revenue * 0.9, // placeholder target until API supports it
      deals: d.deals,
    }));

  // Rank by deals closed (descending)
  const byDeals: LeaderboardRow[] = [...rawData]
    .sort((a, b) => b.deals - a.deals)
    .map((d, idx) => ({
      rank: idx + 1,
      rep: d.rep,
      revenue: d.revenue,
      target: d.revenue * 0.9,
      deals: d.deals,
    }));

  const displayData = activeTab === 'revenue' ? byRevenue : byDeals;

  return (
    <section id="leaderboards" className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Leaderboards</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Top performing reps ranked by revenue and deals closed.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { value: 'revenue', label: 'By Revenue' },
          { value: 'deals', label: 'By Deals Closed' },
        ] as { value: ActiveTab; label: string }[]).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <LeaderboardTable data={displayData} isLoading={isLoading} />
    </section>
  );
}
