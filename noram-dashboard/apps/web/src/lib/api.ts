import axios from 'axios';
import type {
  DashboardFilters,
  KPISummary,
  Opportunity,
  Account,
  User,
  FinancialTrendPoint,
  ApiResponse,
} from '@/types';

// ─── Axios instance ────────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

// ─── Query param builder ──────────────────────────────────────────────────────

function filtersToParams(filters: DashboardFilters): Record<string, string> {
  const params: Record<string, string> = {
    dateRange: filters.dateRange,
  };
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate)   params.endDate   = filters.endDate;
  if (filters.repId)     params.repId     = filters.repId;
  if (filters.tier)      params.tier      = filters.tier;
  return params;
}

// ─── API functions ─────────────────────────────────────────────────────────────

/**
 * Fetch the executive KPI summary (net revenue, frontbook MNR, backbook, TPV, etc.)
 */
export async function fetchKPISummary(filters: DashboardFilters): Promise<KPISummary> {
  const { data } = await apiClient.get<ApiResponse<KPISummary>>('/api/kpi/summary', {
    params: filtersToParams(filters),
  });
  return data.data;
}

/**
 * Fetch open pipeline opportunities, optionally filtered by stage / rep / tier.
 */
export async function fetchPipeline(filters: DashboardFilters): Promise<Opportunity[]> {
  const { data } = await apiClient.get<ApiResponse<Opportunity[]>>('/api/pipeline', {
    params: filtersToParams(filters),
  });
  return data.data;
}

/**
 * Fetch backbook accounts with their latest financial actuals.
 */
export async function fetchBackbook(filters: DashboardFilters): Promise<Account[]> {
  const { data } = await apiClient.get<ApiResponse<Account[]>>('/api/backbook', {
    params: filtersToParams(filters),
  });
  return data.data;
}

/**
 * Fetch rep leaderboard — ranked by revenue, includes deals closed and variance vs target.
 */
export async function fetchLeaderboard(
  filters: DashboardFilters
): Promise<{ rep: User; revenue: number; deals: number }[]> {
  const { data } = await apiClient.get<
    ApiResponse<{ rep: User; revenue: number; deals: number }[]>
  >('/api/leaderboard', {
    params: filtersToParams(filters),
  });
  return data.data;
}

/**
 * Fetch monthly financial trends — revenue actuals vs targets, plus TPV.
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
