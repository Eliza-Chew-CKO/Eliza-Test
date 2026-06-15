import axios from 'axios';
import type {
  KPISummary,
  Opportunity,
  Account,
  User,
  DashboardFilters,
  ApiResponse,
  FinancialTrendPoint,
} from '@/types';

// Base URL is set via environment variable.
// In production, this points to the deployed Express API.
// In local dev, Next.js rewrites /api/* → localhost:4000/api/* (see next.config.js).
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// -----------------------------------------------------------------------
// Helper: build query params from DashboardFilters
// -----------------------------------------------------------------------
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

// -----------------------------------------------------------------------
// KPI Summary
// -----------------------------------------------------------------------
export async function fetchKPISummary(filters: DashboardFilters): Promise<KPISummary> {
  const response = await apiClient.get<ApiResponse<KPISummary>>('/api/kpi/summary', {
    params: filtersToParams(filters),
  });
  return response.data.data;
}

// -----------------------------------------------------------------------
// Pipeline / Opportunities
// -----------------------------------------------------------------------
export async function fetchPipeline(filters: DashboardFilters): Promise<Opportunity[]> {
  const response = await apiClient.get<ApiResponse<Opportunity[]>>('/api/pipeline', {
    params: filtersToParams(filters),
  });
  return response.data.data;
}

// -----------------------------------------------------------------------
// Backbook Accounts
// -----------------------------------------------------------------------
export async function fetchBackbook(filters: DashboardFilters): Promise<Account[]> {
  const response = await apiClient.get<ApiResponse<Account[]>>('/api/backbook', {
    params: filtersToParams(filters),
  });
  return response.data.data;
}

// -----------------------------------------------------------------------
// Leaderboard
// -----------------------------------------------------------------------
export async function fetchLeaderboard(
  filters: DashboardFilters
): Promise<{ rep: User; revenue: number; deals: number }[]> {
  const response = await apiClient.get<
    ApiResponse<{ rep: User; revenue: number; deals: number }[]>
  >('/api/leaderboard', {
    params: filtersToParams(filters),
  });
  return response.data.data;
}

// -----------------------------------------------------------------------
// Financial Trends (revenue actuals vs targets by month)
// -----------------------------------------------------------------------
export async function fetchFinancialTrends(
  filters: DashboardFilters
): Promise<FinancialTrendPoint[]> {
  const response = await apiClient.get<ApiResponse<FinancialTrendPoint[]>>(
    '/api/kpi/trends',
    { params: filtersToParams(filters) }
  );
  return response.data.data;
}
