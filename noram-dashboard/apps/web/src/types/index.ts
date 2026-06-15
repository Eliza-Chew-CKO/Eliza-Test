// ─── Core domain types ────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  salesRegion: string;
  createdAt: string; // ISO date string
}

export interface Account {
  id: string;
  alias: string;
  tier: 'Enterprise' | 'Mid-Market' | 'SMB';
  isManaged: boolean;
  salesRepId: string;
  accountManagerId: string | null;
  goLiveDate: string | null; // ISO date string
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
  enteredAt: string; // ISO date string
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
  closeDate: string; // ISO date string
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
  reportingMonth: string; // ISO date string (first day of month)
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
  reportingMonth: string; // ISO date string
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

// ─── Aggregated / computed types ──────────────────────────────────────────────

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
  vampRatioAvg: number;
}

// ─── Dashboard filter state ───────────────────────────────────────────────────

export interface DashboardFilters {
  dateRange: 'MTD' | 'YTD' | 'CUSTOM';
  startDate?: string; // ISO date string, used when dateRange === 'CUSTOM'
  endDate?: string;   // ISO date string, used when dateRange === 'CUSTOM'
  repId: string | null;
  tier: string | null;
}

// ─── API response wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

// ─── Leaderboard entry ────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  rep: User;
  revenue: number;
  target: number;
  deals: number;
}

// ─── Trend chart data point ───────────────────────────────────────────────────

export interface TrendDataPoint {
  month: string; // "Jan 2025"
  actual: number;
  target: number;
}
