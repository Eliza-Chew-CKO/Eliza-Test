'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const VAMP_TREND = [
  { month: 'Jan', ratio: 0.008 }, { month: 'Feb', ratio: 0.009 }, { month: 'Mar', ratio: 0.011 },
  { month: 'Apr', ratio: 0.013 }, { month: 'May', ratio: 0.010 }, { month: 'Jun', ratio: 0.007 },
];

const MANAGED_CLIENTS = [
  { alias: 'Merchant A', tier: 'Tier 1', rating: 'Gold', qtdMR: 320000, pctToTarget: 0.94, ytdTPV: 45_000_000 },
  { alias: 'Merchant B', tier: 'Tier 1', rating: 'Gold', qtdMR: 280000, pctToTarget: 1.02, ytdTPV: 38_000_000 },
  { alias: 'Merchant C', tier: 'Tier 2', rating: 'Silver', qtdMR: 150000, pctToTarget: 0.87, ytdTPV: 22_000_000 },
];

export default function BackbookAccount() {
  return (
    <section id="backbook-account" className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Backbook & Account Management</h2>

      {/* Managed Client Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Managed Backbook Client Performance</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
              <th className="pb-2">Client</th>
              <th className="pb-2">Tier</th>
              <th className="pb-2">Rating</th>
              <th className="pb-2 text-right">QTD MR</th>
              <th className="pb-2 text-right">MR % to Target</th>
              <th className="pb-2 text-right">YTD TPV</th>
            </tr>
          </thead>
          <tbody>
            {MANAGED_CLIENTS.map((c) => (
              <tr key={c.alias} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 text-white font-medium">{c.alias}</td>
                <td className="py-2 text-gray-400">{c.tier}</td>
                <td className="py-2 text-gray-400">{c.rating}</td>
                <td className="py-2 text-right text-gray-300">${(c.qtdMR/1000).toFixed(0)}K</td>
                <td className={`py-2 text-right font-medium ${c.pctToTarget >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                  {(c.pctToTarget * 100).toFixed(0)}%
                </td>
                <td className="py-2 text-right text-gray-300">${(c.ytdTPV/1_000_000).toFixed(1)}M</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VAMP Ratio Trend */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Backbook VAMP Ratio by Month</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={VAMP_TREND}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${(v * 100).toFixed(2)}%`, 'VAMP Ratio']} />
            {/* Excessive threshold line at 1.5% */}
            <Line type="monotone" dataKey="ratio" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} name="VAMP Ratio" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
