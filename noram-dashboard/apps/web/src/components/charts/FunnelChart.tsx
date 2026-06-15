'use client';

import {
  ResponsiveContainer,
  FunnelChart as RechartsFunnelChart,
  Funnel,
  LabelList,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface FunnelStage {
  stage: string;
  count: number;
  value: number;
}

interface FunnelChartProps {
  data: FunnelStage[];
  height?: number;
}

// Colours assigned per pipeline stage
const STAGE_COLORS: Record<string, string> = {
  Discovery: '#93c5fd',
  Scoping: '#60a5fa',
  Proposal: '#3b82f6',
  Negotiation: '#1d4ed8',
  'Closed Won': '#10b981',
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: any[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as FunnelStage;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-neutral-900">{item.stage}</p>
      <p className="text-neutral-600">
        Deals: <span className="font-medium text-neutral-900">{item.count}</span>
      </p>
      <p className="text-neutral-600">
        Value:{' '}
        <span className="font-medium text-neutral-900">
          {formatCurrency(item.value)}
        </span>
      </p>
    </div>
  );
}

export default function FunnelChart({ data, height = 320 }: FunnelChartProps) {
  // Recharts Funnel expects a `fill` field on each data item
  const coloredData = data.map((d) => ({
    ...d,
    name: d.stage,
    fill: STAGE_COLORS[d.stage] ?? '#6b7280',
    // Recharts Funnel uses `value` as the width metric
    value: d.count,
    rawValue: d.value,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsFunnelChart>
        <Tooltip content={<CustomTooltip />} />
        <Funnel dataKey="value" data={coloredData} isAnimationActive>
          <LabelList
            dataKey="stage"
            position="center"
            style={{ fill: '#fff', fontSize: 13, fontWeight: 600 }}
          />
        </Funnel>
      </RechartsFunnelChart>
    </ResponsiveContainer>
  );
}
