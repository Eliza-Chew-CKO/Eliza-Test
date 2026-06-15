'use client';

import {
  FunnelChart as RechartsFunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface FunnelDataPoint {
  stage: string;
  count: number;
  value: number;
}

interface FunnelChartProps {
  data: FunnelDataPoint[];
  height?: number;
}

// Colours for each pipeline stage (ordered)
const STAGE_COLORS = [
  '#0070f3', // Discovery   — brand blue
  '#3385ff', // Scoping
  '#8b5cf6', // Proposal    — purple
  '#f59e0b', // Negotiation — amber
  '#10b981', // Closed Won  — green
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as FunnelDataPoint & { fill: string };
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 shadow-lg text-sm">
      <p className="font-semibold text-neutral-800 mb-1">{d.stage}</p>
      <p className="text-neutral-500">
        Deals: <span className="font-medium text-neutral-800">{formatNumber(d.count)}</span>
      </p>
      <p className="text-neutral-500">
        Value: <span className="font-medium text-neutral-800">{formatCurrency(d.value, 'USD', true)}</span>
      </p>
    </div>
  );
}

export default function FunnelChart({ data, height = 320 }: FunnelChartProps) {
  const chartData = data.map((d, i) => ({
    ...d,
    fill: STAGE_COLORS[i % STAGE_COLORS.length],
    name: d.stage,
    value: d.count, // Recharts Funnel uses `value` for sizing
    dealValue: d.value,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsFunnelChart margin={{ top: 8, right: 80, left: 80, bottom: 8 }}>
        <Tooltip content={<CustomTooltip />} />
        <Funnel
          dataKey="value"
          data={chartData}
          isAnimationActive
          lastShapeType="rectangle"
        >
          <LabelList
            position="right"
            fill="#374151"
            stroke="none"
            fontSize={12}
            dataKey="stage"
          />
          <LabelList
            position="left"
            fill="#9ca3af"
            stroke="none"
            fontSize={11}
            dataKey="count"
            formatter={(v: number) => `${formatNumber(v)} deals`}
          />
        </Funnel>
      </RechartsFunnelChart>
    </ResponsiveContainer>
  );
}
