import { prisma } from '../lib/prisma';
import { DashboardFilters, subMonths } from '../middleware/filters';

// Stages excluded from weighted pipeline display (PRD spec)
const EXCLUDED_STAGES = ['disqualified', 'terminated merchant', 'qa required', 'closed/won', 'closed/lost', 'closed lost', 'merchant lost'];
const GOLIATH_ALIAS = 'GOLIATH capital';

function isExcludedStage(stage: string): boolean {
  return EXCLUDED_STAGES.some(s => stage.toLowerCase().includes(s));
}

// ─── Weighted Pipeline Over Time ──────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  explore: 'Explore',
  propose: 'Propose',
  trade: 'Trade',
  handover: 'Handover',
  live: 'Live',
};

function normalizeStageLabel(raw: string): string {
  const s = raw.toLowerCase();
  if (s.startsWith('explore') || s.startsWith('e1') || s.startsWith('e2')) return 'Explore';
  if (s.startsWith('propose') || s.startsWith('p1') || s.startsWith('p2')) return 'Propose';
  if (s.startsWith('trade') || s.startsWith('t1') || s.startsWith('t2')) return 'Trade';
  if (s.startsWith('handover') || s.startsWith('h1') || s.startsWith('h2')) return 'Handover';
  if (s.startsWith('live') || s.startsWith('l1')) return 'Live';
  return 'Other';
}

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

export async function getWeightedPipeline(filters: DashboardFilters): Promise<WeightedPipelinePoint[]> {
  const snapshots = await prisma.pipelineSnapshot.findMany({
    where: {
      snapshotDate: { gte: filters.startDate, lte: filters.endDate },
      stageName: { notIn: EXCLUDED_STAGES.map(s => s) },
      opportunity: {
        accountName: { not: { contains: GOLIATH_ALIAS, mode: 'insensitive' } },
        ...(filters.repName ? { salesRepName: { contains: filters.repName, mode: 'insensitive' } } : {}),
      },
    },
    select: { snapshotDate: true, stageName: true, weightedExpectedMNR: true },
  });

  // Filter excluded stages after fetch (case-insensitive)
  const filtered = snapshots.filter(s => !isExcludedStage(s.stageName));

  // Group by month + stage
  const monthStageMap = new Map<string, Record<string, number>>();
  for (const row of filtered) {
    const d = new Date(row.snapshotDate);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const stage = normalizeStageLabel(row.stageName);
    if (!monthStageMap.has(key)) monthStageMap.set(key, { Explore: 0, Propose: 0, Trade: 0, Handover: 0, Live: 0, Other: 0 });
    const bucket = monthStageMap.get(key)!;
    bucket[stage] = (bucket[stage] ?? 0) + Number(row.weightedExpectedMNR);
  }

  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return Array.from(monthStageMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([isoMonth, stages]) => {
      const m = parseInt(isoMonth.split('-')[1]) - 1;
      const year = isoMonth.split('-')[0];
      return {
        month: `${MONTH_LABELS[m]} ${year.slice(2)}`,
        isoMonth,
        Explore: stages.Explore,
        Propose: stages.Propose,
        Trade: stages.Trade,
        Handover: stages.Handover,
        Live: stages.Live,
        total: stages.Explore + stages.Propose + stages.Trade + stages.Handover + stages.Live,
      };
    });
}

// ─── Pipeline Bottlenecks (L90 vs Prior 90) ───────────────────────────────────

export interface BottleneckMetric {
  label: string;
  last90: number;
  prior90: number;
  changePct: number | null;
}

export async function getPipelineBottlenecks(filters: DashboardFilters): Promise<BottleneckMetric[]> {
  const now = new Date();
  const last90Start  = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const prior90Start = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const prior90End   = new Date(last90Start.getTime() - 1);

  const noramFilter = filters.repName
    ? { salesRepName: { contains: filters.repName, mode: 'insensitive' as const } }
    : {};

  // Explore meetings: firstExploreMeetingDate in window
  const [exploreL90, explorePrior90] = await Promise.all([
    prisma.opportunity.count({ where: { firstExploreMeetingDate: { gte: last90Start, lte: now }, ...noramFilter } }),
    prisma.opportunity.count({ where: { firstExploreMeetingDate: { gte: prior90Start, lte: prior90End }, ...noramFilter } }),
  ]);

  // Moved to Propose: dateSetToPropose in window
  const [proposeL90, proposePrior90] = await Promise.all([
    prisma.opportunity.count({ where: { dateSetToPropose: { gte: last90Start, lte: now }, ...noramFilter } }),
    prisma.opportunity.count({ where: { dateSetToPropose: { gte: prior90Start, lte: prior90End }, ...noramFilter } }),
  ]);

  // Moved to Trade: dateSetToTrade in window
  const [tradeL90, tradePrior90] = await Promise.all([
    prisma.opportunity.count({ where: { dateSetToTrade: { gte: last90Start, lte: now }, ...noramFilter } }),
    prisma.opportunity.count({ where: { dateSetToTrade: { gte: prior90Start, lte: prior90End }, ...noramFilter } }),
  ]);

  // Moved to Handover: dateSetToHandover in window
  const [handoverL90, handoverPrior90] = await Promise.all([
    prisma.opportunity.count({ where: { dateSetToHandover: { gte: last90Start, lte: now }, ...noramFilter } }),
    prisma.opportunity.count({ where: { dateSetToHandover: { gte: prior90Start, lte: prior90End }, ...noramFilter } }),
  ]);

  // MAF Submitted
  const [mafL90, mafPrior90] = await Promise.all([
    prisma.opportunity.count({ where: { dateMAFSubmitted: { gte: last90Start, lte: now }, ...noramFilter } }),
    prisma.opportunity.count({ where: { dateMAFSubmitted: { gte: prior90Start, lte: prior90End }, ...noramFilter } }),
  ]);

  // Underwriting approved: dateUnderwritingDone in window AND new value matches approved statuses
  const UW_APPROVED = ['COMPLETED', 'APPROVED BY CKO', 'WAITING FOR CREDENTIALS', 'CREDENTIALS RELEASED'];
  const [uwL90, uwPrior90] = await Promise.all([
    prisma.opportunity.count({ where: { dateUnderwritingDone: { gte: last90Start, lte: now }, underwritingNewValue: { in: UW_APPROVED }, ...noramFilter } }),
    prisma.opportunity.count({ where: { dateUnderwritingDone: { gte: prior90Start, lte: prior90End }, underwritingNewValue: { in: UW_APPROVED }, ...noramFilter } }),
  ]);

  // Technical Stage 4
  const [techL90, techPrior90] = await Promise.all([
    prisma.opportunity.count({ where: { dateTechnicalStage4: { gte: last90Start, lte: now }, isNoram: true, ...noramFilter } }),
    prisma.opportunity.count({ where: { dateTechnicalStage4: { gte: prior90Start, lte: prior90End }, isNoram: true, ...noramFilter } }),
  ]);

  const pct = (l: number, p: number) => p > 0 ? l / p - 1 : null;

  return [
    { label: 'Explore Meetings',      last90: exploreL90,  prior90: explorePrior90,  changePct: pct(exploreL90,  explorePrior90) },
    { label: 'Moved to Propose',      last90: proposeL90,  prior90: proposePrior90,  changePct: pct(proposeL90,  proposePrior90) },
    { label: 'Moved to Trade',        last90: tradeL90,    prior90: tradePrior90,    changePct: pct(tradeL90,    tradePrior90) },
    { label: 'Moved to Handover',     last90: handoverL90, prior90: handoverPrior90, changePct: pct(handoverL90, handoverPrior90) },
    { label: 'MAF Submitted',         last90: mafL90,      prior90: mafPrior90,      changePct: pct(mafL90,      mafPrior90) },
    { label: 'Underwriting Approved', last90: uwL90,       prior90: uwPrior90,       changePct: pct(uwL90,       uwPrior90) },
    { label: 'Technical Stage 4',     last90: techL90,     prior90: techPrior90,     changePct: pct(techL90,     techPrior90) },
  ];
}

// ─── Go-Live Tracker ──────────────────────────────────────────────────────────

export interface GoLiveTracker {
  count: number;
  goldCount: number;
  target: number | null;
  goldTarget: number | null;
  pacedTarget: number | null;
  pctToTarget: number | null;
  pctToPacedTarget: number | null;
}

export async function getGoLiveTracker(filters: DashboardFilters): Promise<GoLiveTracker> {
  const [count, goldCount] = await Promise.all([
    prisma.goLive.count({ where: { reportingMonth: { gte: filters.startDate, lte: filters.endDate } } }),
    prisma.goLive.count({ where: { reportingMonth: { gte: filters.startDate, lte: filters.endDate }, rating: { equals: 'Gold', mode: 'insensitive' } } }),
  ]);

  const [totalTgt, goldTgt] = await Promise.all([
    prisma.target.findFirst({ where: { type: 'GO_LIVE_TOTAL', period: { lte: filters.endDate } }, orderBy: { period: 'desc' } }),
    prisma.target.findFirst({ where: { type: 'GO_LIVE_GOLD', period: { lte: filters.endDate } }, orderBy: { period: 'desc' } }),
  ]);

  const tgt = totalTgt ? Number(totalTgt.amount) : null;
  const gTgt = goldTgt ? Number(goldTgt.amount) : null;

  return {
    count,
    goldCount,
    target: tgt,
    goldTarget: gTgt,
    pacedTarget: null, // paced target requires interpolation logic — can add later
    pctToTarget: tgt ? count / tgt - 1 : null,
    pctToPacedTarget: null,
  };
}
