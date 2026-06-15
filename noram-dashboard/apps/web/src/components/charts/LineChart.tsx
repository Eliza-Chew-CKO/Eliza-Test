'use client';

import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCompact } from '@/lib/utils';

interface LineConfig {
  key: string;
  color: string;
  label: string;
}

interface LineChartProps {
  data: Array<{ month: string; [key: string]: unknown }>;
  lines: LineConfig[];
  height?: number;
  yAxisFormatter?: (value: number) => string;
}

export default function LineChart({
  data,
  lines,
  height = 300,
  yAxisFormatter = formatCompact,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="month"
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
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
        />
        {lines.map(({ key, color, label }) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={label}
            stroke={color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
