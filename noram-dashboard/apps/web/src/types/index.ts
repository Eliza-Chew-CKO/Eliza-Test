// ============================================================
// Core domain types for the NORAM Sales Dashboard
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  salesRegion: string;
  createdAt: string; // ISO date string from API
}

export interface Account {
  id: string;
  alias: string;
  tier: 'Enterprise' | 'Mid-Market' | 'SMB';
  isManaged: boolean;
  salesRepId: string;
  accountManagerId: string | null;
  goLiveDate: string | null;
  region: string;
  referralPartner: string | null;
  sector: string | null;
  createdAt: string;
}

export type OpportunityStage =
  | 'Discovery'
  | 'Scoping'
  | 'Proposal'
  | 'Negotiation'
  | 'Closed Won'
  | 'Closed Lost';

export type OpportunityType = 'New Logo' | 'Expansion' | 'Renewal';

export interface StageHistoryEntry {
  stage: OpportunityStage;
  enteredAt: string;
  exitedAt: string | null;
}

export interface Opportunity {
  id: string;
  accountId: string;
  salesRepId: string;
  stage: OpportunityStage;
  type: OpportunityType;
  baseMonthlyRevenue: number;
  rollMonthlyRevenue: number;
  weightedExpectedMNR: number;
  closeDate: string;
  goLiveDate: string | null;
  rating: string | null;
  secondOwnerId: string | null;
  stageHistory: StageHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface FinancialActual {
  id: string;
  accountId: string;
  reportingMonth: string; // ISO date — first day of the month
  totalFees: number;
  grossFX: number;
  ccpExclusion: number;
  netRevenue: number;
  tpvAmount: number;
  binType: string | null;
  acquirerId: string | null;
  createdAt: string;
}

export type TargetType =
  | 'FRONTBOOK_BASE'
  | 'FRONTBOOK_ROLL'
  | 'BACKBOOK_MANAGED'
  | 'BACKBOOK_UNMANAGED'
  | 'TPV';

export interface Target {
  id: string;
  period: string; // "YYYY-MM"
  type: TargetType;
  amount: number;
  goLiveCount: number | null;
  createdAt: string;
}

export interface VampRecord {
  id: string;
  accountId: string;
  reportingMonth: string;
  createdEvents: number;
  fraudEvents: number;
  totalCapturedEvents: number;
  vampRatio: number;
  vampType: string;
  vampAssessment: string | null;
  acquirerCountry: string | null;
  acquirerId: string | null;
  createdAt: string;
}

// ============================================================
// Aggregated / computed types for dashboard views
// ============================================================

export interface KPISummary {
  netRevenue: number;
  netRevenueTarget: number;
  netRevenueVariance: number;
  netRevenueVariancePct: number;
  frontbookMNR: number;
  frontbookTarget: number;
  backbookRevenue: number;
  tpvAmount: number;
  goLiveCount: number;
  vampRatio?: number;
}

export interface DashboardFilters {
  dateRange: 'MTD' | 'YTD' | 'CUSTOM';
  startDate?: string; // ISO date string, used when dateRange === 'CUSTOM'
  endDate?: string;
  repId?: string | null;
  tier?: string | null;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

// ============================================================
// Table / leaderboard row shapes
// ============================================================

export interface LeaderboardRow {
  rank: number;
  rep: User;
  revenue: number;
  target: number;
  deals: number;
}

export interface FinancialTrendPoint {
  month: string;     // "Jan 2025"
  actual: number;
  target: number;
}

export interface PipelineFunnelStage {
  stage: string;
  count: number;
  value: number;
}
