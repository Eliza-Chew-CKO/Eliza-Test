'use client';

import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  defs,
  linearGradient,
  stop,
} from 'recharts';
import { formatNumber } from '@/lib/utils';

interface AreaConfig {
  key: string;
  color: string;
  label: string;
  fillOpacity?: number;
}

interface AreaChartProps {
  data: Record<string, any>[];
  areas: AreaConfig[];
  height?: number;
}

// Build a stable gradient ID from the area key
function gradientId(key: string) {
  return `gradient-${key}`;
}

export default function AreaChart({ data, areas, height = 300 }: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        {/* Gradient definitions */}
        <defs>
          {areas.map((area) => (
            <linearGradient
              key={area.key}
              id={gradientId(area.key)}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={area.color}
                stopOpacity={area.fillOpacity ?? 0.3}
              />
              <stop offset="95%" stopColor={area.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatNumber}
        />
        <Tooltip
          formatter={(value: number, name: string) => [formatNumber(value), name]}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
        />
        {areas.map((area) => (
          <Area
            key={area.key}
            type="monotone"
            dataKey={area.key}
            name={area.label}
            stroke={area.color}
            strokeWidth={2}
            fill={`url(#${gradientId(area.key)})`}
            dot={false}
            activeDot={{ r: 5, fill: area.color }}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
