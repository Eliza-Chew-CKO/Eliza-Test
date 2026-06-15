'use client';

import type { DashboardFilters } from '@/types';
import { cn } from '@/lib/utils';

interface GlobalFiltersProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

const DATE_RANGE_OPTIONS: { label: string; value: DashboardFilters['dateRange'] }[] = [
  { label: 'MTD', value: 'MTD' },
  { label: 'YTD', value: 'YTD' },
  { label: 'Custom', value: 'CUSTOM' },
];

const TIER_OPTIONS = [
  { label: 'All Tiers', value: '' },
  { label: 'Enterprise', value: 'Enterprise' },
  { label: 'Mid-Market', value: 'Mid-Market' },
  { label: 'SMB', value: 'SMB' },
];

// Placeholder rep options — in production these would be fetched from /api/users
const REP_OPTIONS = [
  { label: 'All Reps', value: '' },
  { label: 'Alice Johnson', value: 'rep_alice' },
  { label: 'Bob Martinez', value: 'rep_bob' },
  { label: 'Carol Lee', value: 'rep_carol' },
  { label: 'David Kim', value: 'rep_david' },
];

export default function GlobalFilters({ filters, onChange }: GlobalFiltersProps) {
  const isCustom = filters.dateRange === 'CUSTOM';

  function update(patch: Partial<DashboardFilters>) {
    onChange({ ...filters, ...patch });
  }

  function clearFilters() {
    onChange({ dateRange: 'MTD', repId: null, tier: null });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-neutral-200 bg-white p-4">
      {/* Date range toggle */}
      <div className="flex items-center gap-1 rounded-md border border-neutral-200 p-0.5">
        {DATE_RANGE_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => update({ dateRange: value })}
            className={cn(
              'rounded px-3 py-1.5 text-sm font-medium transition-colors',
              filters.dateRange === value
                ? 'bg-primary-600 text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom date pickers — only shown when CUSTOM is selected */}
      {isCustom && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500">From</label>
          <input
            type="date"
            value={filters.startDate ?? ''}
            onChange={(e) => update({ startDate: e.target.value })}
            className="rounded border border-neutral-300 px-2 py-1.5 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <label className="text-xs text-neutral-500">To</label>
          <input
            type="date"
            value={filters.endDate ?? ''}
            onChange={(e) => update({ endDate: e.target.value })}
            className="rounded border border-neutral-300 px-2 py-1.5 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Rep select */}
      <select
        value={filters.repId ?? ''}
        onChange={(e) => update({ repId: e.target.value || null })}
        className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {REP_OPTIONS.map(({ label, value }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* Tier select */}
      <select
        value={filters.tier ?? ''}
        onChange={(e) => update({ tier: e.target.value || null })}
        className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {TIER_OPTIONS.map(({ label, value }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* Clear button */}
      <button
        onClick={clearFilters}
        className="ml-auto rounded px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
      >
        Clear filters
      </button>
    </div>
  );
}
