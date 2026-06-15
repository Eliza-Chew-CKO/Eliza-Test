import axios from 'axios';
import type {
  DashboardFilters,
  KPISummary,
  Opportunity,
  Account,
  User,
  TrendDataPoint,
  ApiResponse,
} from '@/types';

// Base URL — falls back to localhost for local development
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

// ─── Query param builder ───────────────────────────────────────────────────────

function buildParams(filters: DashboardFilters): Record<string, string> {
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
 * Fetch the executive KPI summary.
 * Maps to GET /api/kpi/summary
 */
export async function fetchKPISummary(filters: DashboardFilters): Promise<KPISummary> {
  const params = buildParams(filters);
  const response = await apiClient.get<ApiResponse<KPISummary>>('/api/kpi/summary', { params });
  return response.data.data;
}

/**
 * Fetch open pipeline opportunities.
 * Maps to GET /api/pipeline
 */
export async function fetchPipeline(filters: DashboardFilters): Promise<Opportunity[]> {
  const params = buildParams(filters);
  const response = await apiClient.get<ApiResponse<Opportunity[]>>('/api/pipeline', { params });
  return response.data.data;
}

/**
 * Fetch backbook accounts with their latest financials.
 * Maps to GET /api/backbook
 */
export async function fetchBackbook(filters: DashboardFilters): Promise<Account[]> {
  const params = buildParams(filters);
  const response = await apiClient.get<ApiResponse<Account[]>>('/api/backbook', { params });
  return response.data.data;
}

/**
 * Fetch rep leaderboard sorted by revenue.
 * Maps to GET /api/leaderboard
 */
export async function fetchLeaderboard(
  filters: DashboardFilters,
): Promise<{ rep: User; revenue: number; deals: number }[]> {
  const params = buildParams(filters);
  const response = await apiClient.get<
    ApiResponse<{ rep: User; revenue: number; deals: number }[]>
  >('/api/leaderboard', { params });
  return response.data.data;
}

/**
 * Fetch monthly revenue actuals vs targets for trend charts.
 * Maps to GET /api/kpi/trends
 */
export async function fetchFinancialTrends(
  filters: DashboardFilters,
): Promise<TrendDataPoint[]> {
  const params = buildParams(filters);
  const response = await apiClient.get<ApiResponse<TrendDataPoint[]>>('/api/kpi/trends', {
    params,
  });
  return response.data.data;
}
