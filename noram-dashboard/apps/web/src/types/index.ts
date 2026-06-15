// ─── Core entity types ────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  salesRegion: string;
  createdAt: string;
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
  createdAt: string;
  updatedAt: string;
}

// ─── KPI summary (matches revenueService.ts KPISummary) ──────────────────────

export interface KPIMetric {
  value: number;
  target: number | null;
  variancePct: number | null;
  varianceAbs: number | null;
  runRate: number | null;
  runRateMoMPct: number | null;
  yoyPct: number | null;
}

export interface KPISummary {
  frontbookNR: KPIMetric;
  backbookNR: KPIMetric;
  totalMR: KPIMetric;
  usBinTPV: KPIMetric;
}

// ─── Financial trend (matches revenueService.ts MonthlyPoint) ────────────────

export interface MonthlyPoint {
  month: string;       // 'Jan 26'
  isoMonth: string;    // '2026-01'
  actual: number;
  cumulActual: number;
  baseTarget: number | null;
  rollTarget: number | null;
  cumulBase: number | null;
  cumulRoll: number | null;
}

export interface CombinedTrendPoint {
  month: string;
  isoMonth: string;
  fbActual: number;
  bbActual: number;
  cumulFB: number;
  cumulBB: number;
  fbTarget: number | null;
  bbTarget: number | null;
  tpv: number;
}

// ─── TPV trend point ──────────────────────────────────────────────────────────

export interface TPVPoint {
  month: string;
  isoMonth: string;
  volume: number;
}

// ─── Pipeline (matches pipelineService.ts) ───────────────────────────────────

export interface WeightedPipelinePoint {
  month: string;
  isoMonth: string;
  Explore: number;
  Propose: number;
  Trade: number;
  Handover: number;
  Live: number;
  total: number;
}

export interface BottleneckMetric {
  label: string;
  last90: number;
  prior90: number;
  changePct: number | null;
}

export interface GoLiveTracker {
  count: number;
  goldCount: number;
  target: number | null;
  goldTarget: number | null;
  pacedTarget: number | null;
  pctToTarget: number | null;
  pctToPacedTarget: number | null;
}

// ─── Backbook (matches backbookService.ts BackbookClientRow) ─────────────────

export interface BackbookClientRow {
  alias: string;
  accountName: string | null;
  tier: string | null;
  rating: string | null;
  accountManager: string | null;
  salesRep: string | null;
  isManaged: boolean;
  qtdMR: number;
  mrYTD: number;
  mrLastMonth: number;
  mrYoYPct: number | null;
  tpvYTD: number;
  tpvLastMonth: number;
  pctToTarget: number | null;
}

// ─── Leaderboard (matches leaderboardService.ts RepLeaderboardRow) ────────────

export interface LeaderboardEntry {
  rank: number;
  repName: string;
  mrYTD: number;
  mrLastMonth: number;
  mrYTDPct: number;
  tpvYTD: number;
  dealCount: number;
}

// ─── Dashboard filter state ───────────────────────────────────────────────────

export interface DashboardFilters {
  dateRange: 'MTD' | 'YTD' | 'CUSTOM';
  startDate?: string;
  endDate?: string;
  repId?: string | null;
  tier?: string | null;
}

// ─── Generic API wrapper ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

// ─── Pipeline funnel stage ────────────────────────────────────────────────────

export interface PipelineFunnelStage {
  stage: string;
  count: number;
  value: number;
}
