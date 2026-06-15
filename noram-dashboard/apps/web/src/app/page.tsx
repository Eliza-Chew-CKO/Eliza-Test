'use client';

import { useState } from 'react';
import type { DashboardFilters } from '@/types';
import GlobalFilters from '@/components/layout/GlobalFilters';
import ExecutiveSummary from '@/components/sections/ExecutiveSummary';
import FinancialTrends from '@/components/sections/FinancialTrends';
import FrontbookPipeline from '@/components/sections/FrontbookPipeline';
import BackbookAccount from '@/components/sections/BackbookAccount';
import Leaderboards from '@/components/sections/Leaderboards';

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: 'MTD',
    repId: null,
    tier: null,
  });

  return (
    <div className="space-y-8">
      {/* Global filter bar — affects all sections */}
      <GlobalFilters filters={filters} onChange={setFilters} />

      {/* Section 1: Executive KPI summary */}
      <ExecutiveSummary filters={filters} />

      {/* Section 2: Revenue trends vs targets */}
      <FinancialTrends filters={filters} />

      {/* Section 3: Frontbook pipeline funnel + opportunity table */}
      <FrontbookPipeline filters={filters} />

      {/* Section 4: Backbook account health */}
      <BackbookAccount filters={filters} />

      {/* Section 5: Rep leaderboards */}
      <Leaderboards filters={filters} />
    </div>
  );
}
