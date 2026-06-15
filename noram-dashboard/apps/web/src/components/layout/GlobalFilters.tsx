'use client';

import { cn } from '@/lib/utils';
import type { DashboardFilters } from '@/types';

interface GlobalFiltersProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

const DATE_RANGE_OPTIONS: { value: DashboardFilters['dateRange']; label: string }[] = [
  { value: 'MTD', label: 'MTD' },
  { value: 'YTD', label: 'YTD' },
  { value: 'CUSTOM', label: 'Custom' },
];

const TIER_OPTIONS = [
  { value: '', label: 'All Tiers' },
  { value: 'Enterprise', label: 'Enterprise' },
  { value: 'Mid-Market', label: 'Mid-Market' },
  { value: 'SMB', label: 'SMB' },
];

// Placeholder rep options — in production these would be fetched from /api/users
const REP_OPTIONS = [
  { value: '', label: 'All Reps' },
  { value: 'rep-1', label: 'Alex Johnson' },
  { value: 'rep-2', label: 'Maria Garcia' },
  { value: 'rep-3', label: 'James Chen' },
  { value: 'rep-4', label: 'Sarah Williams' },
];

export default function GlobalFilters({ filters, onChange }: GlobalFiltersProps) {
  const isCustom = filters.dateRange === 'CUSTOM';

  function setDateRange(dateRange: DashboardFilters['dateRange']) {
    onChange({
      ...filters,
      dateRange,
      // Clear custom dates when switching away from CUSTOM
      startDate: dateRange === 'CUSTOM' ? filters.startDate : undefined,
      endDate:   dateRange === 'CUSTOM' ? filters.endDate   : undefined,
    });
  }

  function clearFilters() {
    onChange({ dateRange: 'MTD', repId: null, tier: null });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      {/* Date range toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1">
        {DATE_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setDateRange(opt.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              filters.dateRange === opt.value
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom date pickers — visible only when CUSTOM is selected */}
      {isCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.startDate ?? ''}
            onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-xs text-neutral-400">to</span>
          <input
            type="date"
            value={filters.endDate ?? ''}
            onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Rep / Owner select */}
      <select
        value={filters.repId ?? ''}
        onChange={(e) => onChange({ ...filters, repId: e.target.value || null })}
        className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {REP_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Tier select */}
      <select
        value={filters.tier ?? ''}
        onChange={(e) => onChange({ ...filters, tier: e.target.value || null })}
        className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {TIER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Clear filters */}
      {(filters.repId || filters.tier || isCustom) && (
        <button
          onClick={clearFilters}
          className="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear
        </button>
      )}
    </div>
  );
}
