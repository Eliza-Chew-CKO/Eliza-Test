import KPICard from '@/components/kpi/KPICard';
import type { KPIMetric } from '@/types';

// Placeholder data — replace with API calls
const PLACEHOLDER_METRICS: KPIMetric[] = [
  { label: 'Total MR 2026 YTD', value: 4_820_000, target: 5_000_000, varianceAbs: -180_000, variancePct: -0.036 },
  { label: 'Frontbook MR YTD', value: 1_240_000, target: 1_400_000, varianceAbs: -160_000, variancePct: -0.114, runRate: 2_976_000 },
  { label: 'Backbook MR YTD', value: 3_580_000, target: 3_600_000, varianceAbs: -20_000, variancePct: -0.006, runRate: 8_592_000 },
  { label: 'Backbook Managed MR', value: 2_100_000, target: 2_200_000, varianceAbs: -100_000, variancePct: -0.045 },
  { label: 'Backbook Unmanaged MR', value: 1_480_000, target: 1_400_000, varianceAbs: 80_000, variancePct: 0.057 },
  { label: 'Total US BIN TPV YTD', value: 892_000_000, target: 850_000_000, varianceAbs: 42_000_000, variancePct: 0.049, currency: true },
];

export default function ExecutiveSummary() {
  return (
    <section id="executive-summary">
      <h2 className="text-lg font-semibold text-white mb-4">Executive Summary</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {PLACEHOLDER_METRICS.map((m) => (
          <KPICard key={m.label} metric={m} />
        ))}
      </div>
    </section>
  );
}
