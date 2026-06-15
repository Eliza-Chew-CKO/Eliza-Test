'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface LineConfig {
  key: string;
  color: string;
  label: string;
}

interface LineChartProps {
  data: Record<string, any>[];
  lines: LineConfig[];
  height?: number;
  /** If true, Y-axis ticks are formatted as currency */
  yAxisCurrency?: boolean;
  xAxisKey?: string;
}

export default function LineChart({
  data,
  lines,
  height = 320,
  yAxisCurrency = true,
  xAxisKey = 'month',
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{ top: 8, right: 16, left: 16, bottom: 4 }}
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
            const label = lines.find((l) => l.key === name)?.label ?? name;
            return [
              yAxisCurrency ? formatCurrency(value) : value,
              label,
            ];
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          formatter={(value: string) =>
            lines.find((l) => l.key === value)?.label ?? value
          }
        />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={line.color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: line.color, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
