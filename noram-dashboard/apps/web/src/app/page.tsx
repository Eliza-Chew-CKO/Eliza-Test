'use client';

import { useState } from 'react';
import type { DashboardFilters } from '@/types';
import { GlobalFilters } from '@/components/layout/GlobalFilters';
import { ExecutiveSummary } from '@/components/sections/ExecutiveSummary';
import { FinancialTrends } from '@/components/sections/FinancialTrends';
import { FrontbookPipeline } from '@/components/sections/FrontbookPipeline';
import { BackbookAccount } from '@/components/sections/BackbookAccount';
import { Leaderboards } from '@/components/sections/Leaderboards';

const DEFAULT_FILTERS: DashboardFilters = {
  dateRange: 'MTD',
  repId: null,
  tier: null,
};

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

  return (
    <div className="space-y-8">
      {/* Global filter bar — sits above all sections */}
      <GlobalFilters filters={filters} onChange={setFilters} />

      {/* Section 1: Top-level KPI cards */}
      <ExecutiveSummary filters={filters} />

      {/* Section 2: Revenue actuals vs targets over time */}
      <FinancialTrends filters={filters} />

      {/* Section 3: Frontbook pipeline funnel + opportunity table */}
      <FrontbookPipeline filters={filters} />

      {/* Section 4: Backbook managed/unmanaged account data */}
      <BackbookAccount filters={filters} />

      {/* Section 5: Rep leaderboards by revenue and deals */}
      <Leaderboards filters={filters} />
    </div>
  );
}
