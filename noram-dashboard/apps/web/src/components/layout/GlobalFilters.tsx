'use client';

import { useState } from 'react';
import type { DashboardFilters } from '@/types';
import { cn } from '@/lib/utils';

const DATE_RANGES: { label: string; value: DashboardFilters['dateRange'] }[] = [
  { label: 'MTD', value: 'MTD' },
  { label: 'YTD', value: 'YTD' },
  { label: 'Custom', value: 'CUSTOM' },
];

const TIERS = [
  { label: 'All Tiers', value: '' },
  { label: 'Enterprise', value: 'Enterprise' },
  { label: 'Mid-Market', value: 'Mid-Market' },
  { label: 'SMB', value: 'SMB' },
];

// Placeholder rep list — in production this would come from the API
const REPS = [
  { label: 'All Reps', value: '' },
  { label: 'Alice Johnson', value: 'rep_001' },
  { label: 'Bob Martinez', value: 'rep_002' },
  { label: 'Carol Smith', value: 'rep_003' },
  { label: 'David Lee', value: 'rep_004' },
];

interface GlobalFiltersProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

export function GlobalFilters({ filters, onChange }: GlobalFiltersProps) {
  const [showCustomDates, setShowCustomDates] = useState(
    filters.dateRange === 'CUSTOM',
  );

  function handleDateRangeChange(value: DashboardFilters['dateRange']) {
    const isCustom = value === 'CUSTOM';
    setShowCustomDates(isCustom);
    onChange({
      ...filters,
      dateRange: value,
      startDate: isCustom ? filters.startDate : undefined,
      endDate: isCustom ? filters.endDate : undefined,
    });
  }

  function handleRepChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange({ ...filters, repId: e.target.value || null });
  }

  function handleTierChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange({ ...filters, tier: e.target.value || null });
  }

  function handleClear() {
    setShowCustomDates(false);
    onChange({ dateRange: 'MTD', repId: null, tier: null });
  }

  const hasActiveFilters = filters.repId || filters.tier || filters.dateRange !== 'MTD';

  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-card">
      <div className="flex flex-wrap items-center gap-4">
        {/* Date range toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-neutral-500 mr-1">Period:</span>
          {DATE_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => handleDateRangeChange(range.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                filters.dateRange === range.value
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
              )}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Custom date pickers (visible when CUSTOM is selected) */}
        {showCustomDates && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-500">From</label>
            <input
              type="date"
              value={filters.startDate ?? ''}
              onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
              className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <label className="text-xs text-neutral-500">To</label>
            <input
              type="date"
              value={filters.endDate ?? ''}
              onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
              className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        )}

        {/* Divider */}
        <div className="hidden h-6 w-px bg-neutral-200 sm:block" />

        {/* Rep / Owner filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-neutral-500">Rep:</label>
          <select
            value={filters.repId ?? ''}
            onChange={handleRepChange}
            className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {REPS.map((rep) => (
              <option key={rep.value} value={rep.value}>
                {rep.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tier filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-neutral-500">Tier:</label>
          <select
            value={filters.tier ?? ''}
            onChange={handleTierChange}
            className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {TIERS.map((tier) => (
              <option key={tier.value} value={tier.value}>
                {tier.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear button — only shown when non-default filters are active */}
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
