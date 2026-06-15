'use client';

import {
  ResponsiveContainer,
  FunnelChart as RechartsFunnelChart,
  Funnel,
  Tooltip,
  LabelList,
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

// Colour ramp from top (discovery) to bottom (closed won)
const STAGE_COLORS = [
  '#0070f3', // primary blue
  '#4d90ff',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
];

interface TooltipPayloadItem {
  payload: FunnelStage & { fill: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 shadow-card text-sm">
      <p className="font-semibold text-neutral-900">{item.stage}</p>
      <p className="text-neutral-500">
        Deals: <span className="font-medium text-neutral-900">{item.count}</span>
      </p>
      <p className="text-neutral-500">
        Total value:{' '}
        <span className="font-medium text-neutral-900">
          {formatCurrency(item.value)}
        </span>
      </p>
    </div>
  );
}

export default function FunnelChart({ data, height = 350 }: FunnelChartProps) {
  // Recharts Funnel expects a flat array with a `fill` and `value` (for sizing)
  const chartData = data.map((stage, i) => ({
    ...stage,
    name: stage.stage,
    fill: STAGE_COLORS[i % STAGE_COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsFunnelChart>
        <Tooltip content={<CustomTooltip />} />
        <Funnel
          dataKey="count"
          data={chartData}
          isAnimationActive
          labelLine={false}
        >
          <LabelList
            dataKey="stage"
            position="center"
            style={{ fontSize: '12px', fill: '#fff', fontWeight: 600 }}
          />
        </Funnel>
      </RechartsFunnelChart>
    </ResponsiveContainer>
  );
}
