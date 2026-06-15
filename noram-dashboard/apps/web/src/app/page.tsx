'use client';

import { useState } from 'react';
import type { DashboardFilters } from '@/types';
import GlobalFilters from '@/components/layout/GlobalFilters';
import ExecutiveSummary from '@/components/sections/ExecutiveSummary';
import FinancialTrends from '@/components/sections/FinancialTrends';
import FrontbookPipeline from '@/components/sections/FrontbookPipeline';
import BackbookAccount from '@/components/sections/BackbookAccount';
import Leaderboards from '@/components/sections/Leaderboards';

const DEFAULT_FILTERS: DashboardFilters = {
  dateRange: 'MTD',
  repId: null,
  tier: null,
};

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

  return (
    <div className="space-y-8">
      {/* Global filter bar — date range, rep, tier */}
      <GlobalFilters filters={filters} onChange={setFilters} />

      {/* Section 1: High-level KPI cards */}
      <ExecutiveSummary filters={filters} />

      {/* Section 2: Revenue actuals vs targets, TPV trends */}
      <FinancialTrends filters={filters} />

      {/* Section 3: Frontbook pipeline funnel + open opportunities table */}
      <FrontbookPipeline filters={filters} />

      {/* Section 4: Backbook account metrics */}
      <BackbookAccount filters={filters} />

      {/* Section 5: Rep leaderboards */}
      <Leaderboards filters={filters} />
    </div>
  );
}
