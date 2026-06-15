'use client';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const WEIGHTED_PIPELINE = [
  { month: 'Jan', explore: 120000, propose: 80000, trade: 50000, handover: 30000, live: 20000 },
  { month: 'Feb', explore: 140000, propose: 95000, trade: 60000, handover: 40000, live: 35000 },
  { month: 'Mar', explore: 130000, propose: 110000, trade: 75000, handover: 55000, live: 50000 },
];

const BOTTLENECKS = [
  { label: 'MAF Submitted', last90: 18, prior90: 15, pct: 0.2 },
  { label: 'Underwriting Approved', last90: 14, prior90: 16, pct: -0.125 },
  { label: 'Technical / Handover', last90: 9, prior90: 8, pct: 0.125 },
];

export default function FrontbookPipeline() {
  return (
    <section id="frontbook-pipeline" className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Frontbook & Pipeline</h2>

      {/* Goal-to-Live Trackers */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Total Go-Lives 2026 YTD', count: 24, target: 30 },
          { label: 'Go-Lives YTD (Paced)', count: 24, target: 27 },
        ].map((t) => (
          <div key={t.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">{t.label}</p>
            <p className="text-3xl font-bold text-white">{t.count} <span className="text-base text-gray-500">/ {t.target}</span></p>
            <div className="mt-3 h-2 bg-gray-800 rounded-full">
              <div
                className="h-2 bg-blue-500 rounded-full"
                style={{ width: `${Math.min((t.count / t.target) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottleneck Counters */}
      <div className="grid grid-cols-3 gap-4">
        {BOTTLENECKS.map((b) => (
          <div key={b.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{b.label}</p>
            <p className="text-2xl font-bold text-white">{b.last90}</p>
            <p className={`text-xs mt-1 ${b.pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {b.pct >= 0 ? '+' : ''}{(b.pct * 100).toFixed(0)}% vs prior 90d
            </p>
          </div>
        ))}
      </div>

      {/* Weighted Pipeline Stacked Bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Weighted Pipeline by Stage</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={WEIGHTED_PIPELINE}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`$${(v/1000).toFixed(0)}K`, '']} />
            <Legend />
            <Bar dataKey="explore" stackId="a" fill="#6366f1" name="Explore" />
            <Bar dataKey="propose" stackId="a" fill="#3b82f6" name="Propose" />
            <Bar dataKey="trade" stackId="a" fill="#06b6d4" name="Trade" />
            <Bar dataKey="handover" stackId="a" fill="#10b981" name="Handover" />
            <Bar dataKey="live" stackId="a" fill="#f59e0b" name="Live" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
