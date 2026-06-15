'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { DateRange, Tier } from '@/types';

const DATE_RANGE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: 'MTD', value: 'MTD' },
  { label: 'YTD', value: 'YTD' },
  { label: 'Custom', value: 'CUSTOM' },
];

const TIER_OPTIONS: { label: string; value: Tier | '' }[] = [
  { label: 'All Tiers', value: '' },
  { label: 'Tier 1', value: 'TIER_1' },
  { label: 'Tier 2', value: 'TIER_2' },
  { label: 'Tier 3', value: 'TIER_3' },
];

export default function GlobalFilters() {
  const [dateRange, setDateRange] = useState<DateRange>('YTD');
  const [tier, setTier] = useState<Tier | ''>('');

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-900 rounded-xl border border-gray-800">
      {/* Date Range Toggle */}
      <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
        {DATE_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setDateRange(opt.value)}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-colors',
              dateRange === opt.value
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Owner / Rep */}
      <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500">
        <option value="">All Owners</option>
        {/* Populated from API */}
      </select>

      {/* Tier / Segment */}
      <select
        value={tier}
        onChange={(e) => setTier(e.target.value as Tier | '')}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
      >
        {TIER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
