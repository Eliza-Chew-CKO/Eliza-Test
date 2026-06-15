'use client';

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  defs,
  linearGradient,
  stop,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

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
  xAxisKey?: string;
  yAxisCurrency?: boolean;
}

export default function AreaChart({
  data,
  areas,
  height = 320,
  xAxisKey = 'month',
  yAxisCurrency = true,
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart
        data={data}
        margin={{ top: 8, right: 16, left: 16, bottom: 4 }}
      >
        {/* Define gradient fills for each area series */}
        <defs>
          {areas.map((area) => (
            <linearGradient
              key={`grad-${area.key}`}
              id={`gradient-${area.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={area.color}
                stopOpacity={area.fillOpacity ?? 0.25}
              />
              <stop offset="95%" stopColor={area.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>

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
            const label = areas.find((a) => a.key === name)?.label ?? name;
            return [
              yAxisCurrency ? formatCurrency(value) : value,
              label,
            ];
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          formatter={(value: string) =>
            areas.find((a) => a.key === value)?.label ?? value
          }
        />
        {areas.map((area) => (
          <Area
            key={area.key}
            type="monotone"
            dataKey={area.key}
            stroke={area.color}
            strokeWidth={2.5}
            fill={`url(#gradient-${area.key})`}
            dot={false}
            activeDot={{ r: 5, fill: area.color, strokeWidth: 0 }}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
