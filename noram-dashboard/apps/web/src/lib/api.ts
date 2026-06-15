import axios from 'axios';
import type {
  DashboardFilters,
  KPISummary,
  Opportunity,
  Account,
  User,
  FinancialTrendPoint,
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
  if (filters.repId) params.repId = filters.repId;
  if (filters.tier) params.tier = filters.tier;
  return params;
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Fetch the top-level KPI summary used by the Executive Summary section.
 * Endpoint: GET /api/kpi/summary
 */
export async function fetchKPISummary(
  filters: DashboardFilters
): Promise<KPISummary> {
  const { data } = await apiClient.get<ApiResponse<KPISummary>>(
    '/api/kpi/summary',
    { params: filtersToParams(filters) }
  );
  return data.data;
}

/**
 * Fetch the list of open opportunities for the pipeline section.
 * Endpoint: GET /api/pipeline
 */
export async function fetchPipeline(
  filters: DashboardFilters
): Promise<Opportunity[]> {
  const { data } = await apiClient.get<ApiResponse<Opportunity[]>>(
    '/api/pipeline',
    { params: filtersToParams(filters) }
  );
  return data.data;
}

/**
 * Fetch the list of accounts with their latest financial actuals.
 * Endpoint: GET /api/backbook
 */
export async function fetchBackbook(
  filters: DashboardFilters
): Promise<Account[]> {
  const { data } = await apiClient.get<ApiResponse<Account[]>>(
    '/api/backbook',
    { params: filtersToParams(filters) }
  );
  return data.data;
}

/**
 * Fetch ranked leaderboard entries for sales reps.
 * Endpoint: GET /api/leaderboard
 */
export async function fetchLeaderboard(
  filters: DashboardFilters
): Promise<LeaderboardEntry[]> {
  const { data } = await apiClient.get<ApiResponse<LeaderboardEntry[]>>(
    '/api/leaderboard',
    { params: filtersToParams(filters) }
  );
  return data.data;
}

/**
 * Fetch monthly revenue actuals vs targets for trend charts.
 * Endpoint: GET /api/kpi/trends
 */
export async function fetchFinancialTrends(
  filters: DashboardFilters
): Promise<FinancialTrendPoint[]> {
  const { data } = await apiClient.get<ApiResponse<FinancialTrendPoint[]>>(
    '/api/kpi/trends',
    { params: filtersToParams(filters) }
  );
  return data.data;
}

export default apiClient;
