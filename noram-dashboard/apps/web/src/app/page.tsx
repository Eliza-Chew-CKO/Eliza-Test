import ExecutiveSummary from '@/components/sections/ExecutiveSummary';
import FinancialTrends from '@/components/sections/FinancialTrends';
import FrontbookPipeline from '@/components/sections/FrontbookPipeline';
import BackbookAccount from '@/components/sections/BackbookAccount';
import Leaderboards from '@/components/sections/Leaderboards';
import GlobalFilters from '@/components/layout/GlobalFilters';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <GlobalFilters />
      <ExecutiveSummary />
      <FinancialTrends />
      <FrontbookPipeline />
      <BackbookAccount />
      <Leaderboards />
    </div>
  );
}
