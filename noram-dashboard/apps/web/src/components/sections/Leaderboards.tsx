const REP_DATA = [
  { rank: 1, name: 'Alex Johnson', mrYTD: 420000, mrLastMonth: 75000 },
  { rank: 2, name: 'Maria Garcia', mrYTD: 380000, mrLastMonth: 68000 },
  { rank: 3, name: 'James Lee', mrYTD: 310000, mrLastMonth: 55000 },
  { rank: 4, name: 'Sarah Kim', mrYTD: 290000, mrLastMonth: 51000 },
  { rank: 5, name: 'Tom Chen', mrYTD: 245000, mrLastMonth: 43000 },
];

const maxMR = REP_DATA[0].mrYTD;

const ACTIVITY_STAGES = ['Explore Meetings', 'Moved to Propose', 'Moved to Trade', 'Moved to Handover'];
const ACTIVITY_DATA = REP_DATA.map((r, i) => ({
  name: r.name,
  counts: [12 - i, 8 - i, 5 - i, 3 - i],
}));

export default function Leaderboards() {
  return (
    <section id="leaderboards" className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Leaderboards</h2>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Rep Leaderboard — MR Performance 2026</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
              <th className="pb-2 w-8">#</th>
              <th className="pb-2">Rep</th>
              <th className="pb-2 text-right">MR YTD</th>
              <th className="pb-2 text-right">MR Last Month</th>
              <th className="pb-2 pl-4">Performance</th>
            </tr>
          </thead>
          <tbody>
            {REP_DATA.map((rep) => (
              <tr key={rep.rank} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 text-gray-500 font-mono">{rep.rank}</td>
                <td className="py-2 text-white font-medium">{rep.name}</td>
                <td className="py-2 text-right text-gray-300">${(rep.mrYTD/1000).toFixed(0)}K</td>
                <td className="py-2 text-right text-gray-300">${(rep.mrLastMonth/1000).toFixed(0)}K</td>
                <td className="py-2 pl-4">
                  <div className="h-1.5 bg-gray-800 rounded-full w-32">
                    <div
                      className="h-1.5 bg-blue-500 rounded-full"
                      style={{ width: `${(rep.mrYTD / maxMR) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {ACTIVITY_STAGES.map((stage, si) => (
          <div key={stage} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-400 mb-3">Top 10: {stage}</h3>
            <ol className="space-y-1.5">
              {ACTIVITY_DATA.map((rep, i) => (
                <li key={rep.name} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 truncate">{i + 1}. {rep.name.split(' ')[0]}</span>
                  <span className="text-gray-300 font-medium ml-2">{rep.counts[si]}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
