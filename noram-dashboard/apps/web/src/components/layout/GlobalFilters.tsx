'use client';

import { useState } from 'react';
import type { DashboardFilters } from '@/types';
import { cn } from '@/lib/utils';

interface GlobalFiltersProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

const DATE_RANGES: Array<{ label: string; value: DashboardFilters['dateRange'] }> = [
  { label: 'MTD', value: 'MTD' },
  { label: 'YTD', value: 'YTD' },
  { label: 'Custom', value: 'CUSTOM' },
];

const TIERS = ['Enterprise', 'Mid-Market', 'SMB'];

// Placeholder reps — in production these would be fetched from the API
const PLACEHOLDER_REPS = [
  { id: 'rep-1', name: 'Alice Johnson' },
  { id: 'rep-2', name: 'Bob Smith' },
  { id: 'rep-3', name: 'Carol Lee' },
  { id: 'rep-4', name: 'David Kim' },
];

export default function GlobalFilters({ filters, onChange }: GlobalFiltersProps) {
  const [showCustomPickers, setShowCustomPickers] = useState(
    filters.dateRange === 'CUSTOM'
  );

  function handleDateRange(value: DashboardFilters['dateRange']) {
    setShowCustomPickers(value === 'CUSTOM');
    onChange({
      ...filters,
      dateRange: value,
      startDate: value !== 'CUSTOM' ? undefined : filters.startDate,
      endDate:   value !== 'CUSTOM' ? undefined : filters.endDate,
    });
  }

  function handleRepChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange({ ...filters, repId: e.target.value || null });
  }

  function handleTierChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange({ ...filters, tier: e.target.value || null });
  }

  function handleClear() {
    setShowCustomPickers(false);
    onChange({ dateRange: 'MTD', repId: null, tier: null });
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-3 shadow-card">
      {/* Date range toggle */}
      <div className="flex items-center gap-1">
        <span className="mr-2 text-xs font-medium text-neutral-500">Period</span>
        {DATE_RANGES.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleDateRange(value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              filters.dateRange === value
                ? 'bg-primary-500 text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom date pickers */}
      {showCustomPickers && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500">From</label>
          <input
            type="date"
            className="input w-36 text-sm"
            value={filters.startDate ?? ''}
            onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
          />
          <label className="text-xs text-neutral-500">To</label>
          <input
            type="date"
            className="input w-36 text-sm"
            value={filters.endDate ?? ''}
            onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
          />
        </div>
      )}

      {/* Divider */}
      <span className="h-6 w-px bg-neutral-200" />

      {/* Rep / Owner filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-neutral-500">Rep</label>
        <select
          className="input w-44 text-sm"
          value={filters.repId ?? ''}
          onChange={handleRepChange}
        >
          <option value="">All Reps</option>
          {PLACEHOLDER_REPS.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tier filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-neutral-500">Tier</label>
        <select
          className="input w-40 text-sm"
          value={filters.tier ?? ''}
          onChange={handleTierChange}
        >
          <option value="">All Tiers</option>
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Clear filters */}
      <button
        type="button"
        onClick={handleClear}
        className="ml-auto rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
      >
        Clear filters
      </button>
    </div>
  );
}
