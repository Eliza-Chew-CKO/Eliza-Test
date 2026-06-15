'use client';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const MONTHLY_DATA = [
  { month: 'Jan', actual: 180000, base: 200000, roll: 220000 },
  { month: 'Feb', actual: 370000, base: 400000, roll: 440000 },
  { month: 'Mar', actual: 590000, base: 620000, roll: 660000 },
  { month: 'Apr', actual: 820000, base: 860000, roll: 900000 },
  { month: 'May', actual: 1050000, base: 1100000, roll: 1150000 },
  { month: 'Jun', actual: 1240000, base: 1350000, roll: 1400000 },
];

export default function FinancialTrends() {
  return (
    <section id="financial-trends" className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Financial Trends</h2>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Frontbook MR Cumulative */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Frontbook MR — Cumulative YTD</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={MONTHLY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`$${(v/1000).toFixed(0)}K`, '']} />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} name="Actuals" />
              <Line type="monotone" dataKey="base" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Base Target" />
              <Line type="monotone" dataKey="roll" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Roll Target" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* US BIN TPV by Month */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Total US BIN TPV by Month</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={MONTHLY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `$${(v/1_000_000).toFixed(0)}M`} tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`$${(v/1_000_000).toFixed(1)}M`, 'TPV']} />
              <Bar dataKey="actual" fill="#3b82f6" radius={[4, 4, 0, 0]} name="TPV" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
