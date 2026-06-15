'use client';

import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface BarConfig {
  key: string;
  color: string;
  label: string;
}

interface BarChartProps {
  data: Record<string, unknown>[];
  bars: BarConfig[];
  height?: number;
  stacked?: boolean;
  formatAsCurrency?: boolean;
  xAxisKey?: string;
}

export default function BarChart({
  data,
  bars,
  height = 300,
  stacked = false,
  formatAsCurrency = true,
  xAxisKey = 'month',
}: BarChartProps) {
  const tickFormatter = formatAsCurrency
    ? (value: number) => formatCurrency(value)
    : (value: number) => String(value);

  const stackId = stacked ? 'stack' : undefined;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        barCategoryGap="25%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey={xAxisKey}
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={tickFormatter}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatAsCurrency ? formatCurrency(value) : value,
            name,
          ]}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            fontSize: '12px',
          }}
          cursor={{ fill: '#f9fafb' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
          iconType="square"
          iconSize={10}
        />
        {bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.label}
            fill={bar.color}
            stackId={stackId}
            radius={stacked ? undefined : [3, 3, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
