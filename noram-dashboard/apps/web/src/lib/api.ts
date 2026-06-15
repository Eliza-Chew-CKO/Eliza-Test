import axios from 'axios';
import type {
  DashboardFilters,
  KPISummary,
  MonthlyPoint,
  TPVPoint,
  WeightedPipelinePoint,
  BottleneckMetric,
  GoLiveTracker,
  BackbookClientRow,
  LeaderboardEntry,
  ApiResponse,
} from '@/types';

// ─── Axios instance ───────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Filter → query param helpers ────────────────────────────────────────────

function filtersToParams(filters: DashboardFilters): Record<string, string> {
  const params: Record<string, string> = {
    dateRange: filters.dateRange,
  };
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.repId) params.repName = filters.repId;
  if (filters.tier) params.tier = filters.tier;
  return params;
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function fetchKPISummary(filters: DashboardFilters): Promise<KPISummary> {
  const { data } = await apiClient.get<ApiResponse<KPISummary>>(
    '/api/kpi/summary',
    { params: filtersToParams(filters) },
  );
  return data.data;
}

export async function fetchFrontbookTrend(filters: DashboardFilters): Promise<MonthlyPoint[]> {
  const { data } = await apiClient.get<ApiResponse<MonthlyPoint[]>>(
    '/api/financials/frontbook-trend',
    { params: filtersToParams(filters) },
  );
  return data.data;
}

export async function fetchBackbookTrend(filters: DashboardFilters): Promise<MonthlyPoint[]> {
  const { data } = await apiClient.get<ApiResponse<MonthlyPoint[]>>(
    '/api/financials/backbook-trend',
    { params: filtersToParams(filters) },
  );
  return data.data;
}

export async function fetchTPVByMonth(filters: DashboardFilters): Promise<TPVPoint[]> {
  const { data } = await apiClient.get<ApiResponse<TPVPoint[]>>(
    '/api/financials/tpv-by-month',
    { params: filtersToParams(filters) },
  );
  return data.data;
}

export async function fetchWeightedPipeline(filters: DashboardFilters): Promise<WeightedPipelinePoint[]> {
  const { data } = await apiClient.get<ApiResponse<WeightedPipelinePoint[]>>(
    '/api/pipeline/weighted-over-time',
    { params: filtersToParams(filters) },
  );
  return data.data;
}

export async function fetchPipelineBottlenecks(filters: DashboardFilters): Promise<BottleneckMetric[]> {
  const { data } = await apiClient.get<ApiResponse<BottleneckMetric[]>>(
    '/api/pipeline/bottlenecks',
    { params: filtersToParams(filters) },
  );
  return data.data;
}

export async function fetchGoLiveTracker(filters: DashboardFilters): Promise<GoLiveTracker> {
  const { data } = await apiClient.get<ApiResponse<GoLiveTracker>>(
    '/api/pipeline/go-live-tracker',
    { params: filtersToParams(filters) },
  );
  return data.data;
}

export async function fetchManagedAccounts(filters: DashboardFilters): Promise<BackbookClientRow[]> {
  const { data } = await apiClient.get<ApiResponse<BackbookClientRow[]>>(
    '/api/backbook/managed',
    { params: filtersToParams(filters) },
  );
  return data.data.map(r => ({ ...r, isManaged: true }));
}

export async function fetchUnmanagedAccounts(filters: DashboardFilters): Promise<BackbookClientRow[]> {
  const { data } = await apiClient.get<ApiResponse<BackbookClientRow[]>>(
    '/api/backbook/unmanaged',
    { params: filtersToParams(filters) },
  );
  return data.data.map(r => ({ ...r, isManaged: false }));
}

export async function fetchLeaderboard(filters: DashboardFilters): Promise<LeaderboardEntry[]> {
  const { data } = await apiClient.get<ApiResponse<LeaderboardEntry[]>>(
    '/api/leaderboard/rep-mr',
    { params: filtersToParams(filters) },
  );
  return data.data;
}

export default apiClient;
