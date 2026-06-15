'use client';

import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  defs,
} from 'recharts';
import { formatCompact } from '@/lib/utils';

interface AreaConfig {
  key: string;
  color: string;
  label: string;
  fillOpacity?: number;
}

interface AreaChartProps {
  data: Array<{ [key: string]: unknown }>;
  areas: AreaConfig[];
  height?: number;
  xAxisKey?: string;
  yAxisFormatter?: (value: number) => string;
}

export default function AreaChart({
  data,
  areas,
  height = 300,
  xAxisKey = 'month',
  yAxisFormatter = formatCompact,
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart
        data={data}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
      >
        {/* Gradient definitions for each area */}
        <defs>
          {areas.map(({ key, color }) => (
            <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>

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
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
        />
        {areas.map(({ key, color, label, fillOpacity = 0.8 }) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            name={label}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#gradient-${key})`}
            fillOpacity={fillOpacity}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: color }}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
