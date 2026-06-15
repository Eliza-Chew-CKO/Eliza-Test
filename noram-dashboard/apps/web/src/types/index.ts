// ─── Enums ────────────────────────────────────────────────────────────────────

export type DateRange = 'MTD' | 'YTD' | 'CUSTOM';
export type Tier = 'TIER_1' | 'TIER_2' | 'TIER_3';
export type BookType = 'FRONTBOOK' | 'BACKBOOK';
export type TargetType = 'FRONTBOOK_BASE' | 'FRONTBOOK_ROLL' | 'BACKBOOK_MANAGED' | 'BACKBOOK_UNMANAGED' | 'TPV';
export type OpportunityStage = 'EXPLORE' | 'PROPOSE' | 'TRADE' | 'HANDOVER' | 'LIVE' | 'CLOSED_WON' | 'DISQUALIFIED';
export type VampType = 'NORMAL' | 'EXCESSIVE';

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface GlobalFilters {
  dateRange: DateRange;
  startDate?: string;
  endDate?: string;
  ownerId?: string;
  tier?: Tier;
}

// ─── KPI / Summary ────────────────────────────────────────────────────────────

export interface KPIMetric {
  label: string;
  value: number;
  target?: number;
  varianceAbs?: number;
  variancePct?: number;
  runRate?: number;
  runRateMoMPct?: number;
  yoyPct?: number;
  currency?: boolean;
}

export interface ExecutiveSummaryData {
  totalMR: KPIMetric;
  frontbookMR: KPIMetric;
  backbookMR: KPIMetric;
  backbookManagedMR: KPIMetric;
  backbookUnmanagedMR: KPIMetric;
  usBinTPV: KPIMetric;
  frontbookRunRate: KPIMetric;
  backbookRunRate: KPIMetric;
}

// ─── Financial Trends ─────────────────────────────────────────────────────────

export interface MonthlyDataPoint {
  month: string; // 'Jan' | 'Feb' | ...
  actual: number;
  baseTarget: number;
  rollTarget: number;
}

export interface RollBaseGapRow {
  account: string;
  salesRep: string;
  closeDate: string;
  stage: OpportunityStage;
  baseMR: number;
  rollMR: number;
  gapAbs: number;
  gapLabel: string;
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export interface GoLiveTracker {
  count: number;
  target: number;
  pacedTarget: number;
}

export interface ClosedWonRow {
  account: string;
  salesRep: string;
  secondOwner?: string;
  rating: string;
  mrYTD: number;
  tpvYTD: number;
  lastMonthMR: number;
}

export interface PipelineBottleneck {
  label: string;
  last90: number;
  prior90: number;
  changePct: number;
}

export interface WeightedPipelinePoint {
  month: string;
  explore: number;
  propose: number;
  trade: number;
  handover: number;
  live: number;
}

export interface PipelineChangeRow {
  account: string;
  salesRep: string;
  previousStage: OpportunityStage;
  currentStage: OpportunityStage;
  changeDirection: 'UPGRADE' | 'DOWNGRADE' | 'NEW';
  changeRationale: string;
  weightedMNR: number;
}

// ─── Backbook / Account Management ───────────────────────────────────────────

export interface BackbookClientRow {
  clientAlias: string;
  tier: Tier;
  rating: string;
  qtdMR: number;
  mrPctToTarget: number;
  ytdTPV: number;
  accountManager?: string;
}

export interface VampMonthlyPoint {
  month: string;
  vampRatio: number;
}

export interface ExcessiveVampRow {
  alias: string;
  owner: string;
  domain: string;
  acquirer: string;
  vampAssessment: number;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface RepLeaderboardRow {
  rank: number;
  repName: string;
  mrYTD: number;
  mrLastMonth: number;
  mrYTDPct: number; // 0-1, for inline bar
}

export interface ActivityLeaderboardRow {
  rank: number;
  repName: string;
  count: number;
}
