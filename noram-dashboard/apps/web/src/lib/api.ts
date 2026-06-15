const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  kpi: {
    summary: (params?: Record<string, string>) => get('/kpi/summary', params),
  },
  pipeline: {
    weightedOverTime: (params?: Record<string, string>) => get('/pipeline/weighted-over-time', params),
    closedWon: (params?: Record<string, string>) => get('/pipeline/closed-won', params),
    bottlenecks: (params?: Record<string, string>) => get('/pipeline/bottlenecks', params),
    changes: (params?: Record<string, string>) => get('/pipeline/changes', params),
  },
  financials: {
    frontbookTrend: (params?: Record<string, string>) => get('/financials/frontbook-trend', params),
    backbookTrend: (params?: Record<string, string>) => get('/financials/backbook-trend', params),
    tpvByMonth: (params?: Record<string, string>) => get('/financials/tpv-by-month', params),
    rollBaseGap: (params?: Record<string, string>) => get('/financials/roll-base-gap', params),
  },
  backbook: {
    managed: (params?: Record<string, string>) => get('/backbook/managed', params),
    unmanaged: (params?: Record<string, string>) => get('/backbook/unmanaged', params),
    vampTrend: (params?: Record<string, string>) => get('/backbook/vamp-trend', params),
    excessiveVamp: (params?: Record<string, string>) => get('/backbook/excessive-vamp', params),
  },
  leaderboard: {
    repMR: (params?: Record<string, string>) => get('/leaderboard/rep-mr', params),
    activity: (stage: string, params?: Record<string, string>) => get(`/leaderboard/activity/${stage}`, params),
  },
};
