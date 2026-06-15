'use client';

import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface LineConfig {
  key: string;
  color: string;
  label: string;
}

interface LineChartProps {
  data: { month: string; [key: string]: unknown }[];
  lines: LineConfig[];
  height?: number;
  /** Format Y-axis and tooltip values as currency */
  formatAsCurrency?: boolean;
}

export default function LineChart({
  data,
  lines,
  height = 300,
  formatAsCurrency = true,
}: LineChartProps) {
  const tickFormatter = formatAsCurrency
    ? (value: number) => formatCurrency(value)
    : (value: number) => String(value);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="month"
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
        />
        <Legend
          wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
          iconType="circle"
          iconSize={8}
        />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color}
            strokeWidth={2}
            dot={{ r: 3, fill: line.color }}
            activeDot={{ r: 5 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
