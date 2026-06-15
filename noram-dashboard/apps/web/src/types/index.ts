// ─── Core domain types ───────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  /** e.g. "AE", "AM", "Sales Manager" */
  role: string;
  salesRegion: string;
  createdAt: string; // ISO date string
}

export interface Account {
  id: string;
  alias: string;
  /** "Enterprise" | "Mid-Market" | "SMB" */
  tier: string;
  isManaged: boolean;
  salesRepId: string;
  accountManagerId: string | null;
  goLiveDate: string | null; // ISO date string
  region: string;
  referralPartner: string | null;
  sector: string | null;
  createdAt: string;
}

export interface StageHistoryEntry {
  stage: string;
  enteredAt: string; // ISO date string
}

export interface Opportunity {
  id: string;
  accountId: string;
  salesRepId: string;
  /** Pipeline stage: Discovery | Scoping | Proposal | Negotiation | Closed Won | Closed Lost */
  stage: string;
  /** "New Logo" | "Expansion" | "Renewal" */
  type: string;
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
  /** First day of the reporting month, ISO date string */
  reportingMonth: string;
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
  /** "YYYY-MM" e.g. "2025-06" */
  period: string;
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

// ─── Aggregated / computed types ─────────────────────────────────────────────

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
  vampRatio: number;
}

export interface LeaderboardEntry {
  rank: number;
  rep: User;
  revenue: number;
  target: number;
  deals: number;
}

export interface FinancialTrendPoint {
  month: string; // "Jan 2025"
  actual: number;
  target: number;
  tpv: number;
}

export interface PipelineFunnelStage {
  stage: string;
  count: number;
  value: number;
}

// ─── Filter / API types ───────────────────────────────────────────────────────

export interface DashboardFilters {
  dateRange: 'MTD' | 'YTD' | 'CUSTOM';
  startDate?: string;   // ISO date, used when dateRange === 'CUSTOM'
  endDate?: string;     // ISO date, used when dateRange === 'CUSTOM'
  repId?: string | null;
  tier?: string | null;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}
