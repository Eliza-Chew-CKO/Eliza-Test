'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface BarConfig {
  key: string;
  color: string;
  label: string;
}

interface BarChartProps {
  data: Record<string, any>[];
  bars: BarConfig[];
  height?: number;
  /** If true, bars for each X-tick are stacked rather than grouped */
  stacked?: boolean;
  xAxisKey?: string;
  yAxisCurrency?: boolean;
}

export default function BarChart({
  data,
  bars,
  height = 320,
  stacked = false,
  xAxisKey = 'month',
  yAxisCurrency = true,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={{ top: 8, right: 16, left: 16, bottom: 4 }}
        barCategoryGap={stacked ? '30%' : '20%'}
        barGap={4}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey={xAxisKey}
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            yAxisCurrency ? formatCurrency(v, 'USD', true) : String(v)
          }
          width={70}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            fontSize: 13,
          }}
          formatter={(value: number, name: string) => {
            const label = bars.find((b) => b.key === name)?.label ?? name;
            return [
              yAxisCurrency ? formatCurrency(value) : value,
              label,
            ];
          }}
          cursor={{ fill: 'rgba(0,112,243,0.05)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          formatter={(value: string) =>
            bars.find((b) => b.key === value)?.label ?? value
          }
        />
        {bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            fill={bar.color}
            stackId={stacked ? 'stack' : undefined}
            radius={stacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
            maxBarSize={48}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
