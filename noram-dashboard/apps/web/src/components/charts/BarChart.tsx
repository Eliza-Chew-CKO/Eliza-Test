'use client';

import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCompact } from '@/lib/utils';

interface BarConfig {
  key: string;
  color: string;
  label: string;
}

interface BarChartProps {
  data: Array<{ [key: string]: unknown }>;
  bars: BarConfig[];
  height?: number;
  /** When true, bars are stacked; otherwise grouped side-by-side */
  stacked?: boolean;
  xAxisKey?: string;
  yAxisFormatter?: (value: number) => string;
}

export default function BarChart({
  data,
  bars,
  height = 300,
  stacked = false,
  xAxisKey = 'month',
  yAxisFormatter = formatCompact,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        barCategoryGap={stacked ? '30%' : '20%'}
        barGap={4}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey={xAxisKey}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={yAxisFormatter}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatCompact(value),
            name,
          ]}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            fontSize: '13px',
          }}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
        />
        <Legend
          iconType="square"
          iconSize={10}
          wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
        />
        {bars.map(({ key, color, label }) => (
          <Bar
            key={key}
            dataKey={key}
            name={label}
            fill={color}
            stackId={stacked ? 'stack' : undefined}
            radius={stacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
            maxBarSize={40}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
