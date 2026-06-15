/**
 * mapOpportunities.ts
 *
 * Maps rows from the "Salesforce Opportunity Snapshot" sheet to Prisma
 * OpportunityCreateInput objects.
 *
 * Expected column names (from Salesforce export):
 *   Opportunity Name      — used to infer account alias
 *   Account Name          — account alias (joined to Account model)
 *   Stage                 — Salesforce stage name (normalised below)
 *   Type                  — "New Business", "Existing Business", etc.
 *   Amount                — base monthly revenue (USD)
 *   Roll Amount           — roll/ramp MNR
 *   Weighted Amount       — pre-weighted MNR (if present, otherwise computed)
 *   Close Date            — expected close date
 *   Go-Live Date          — expected go-live date
 *   Forecast Category     — used to infer rating
 *   Owner                 — sales rep name (resolved to salesRepId)
 *   Second Owner          — co-owner rep name
 */

type OpportunityCreateInput = {
  accountId: string;          // resolved from account alias after upsert
  salesRepId: string;         // resolved from rep name after upsert
  stage: string;
  type: string;
  baseMonthlyRevenue: number;
  rollMonthlyRevenue: number;
  weightedExpectedMNR: number;
  closeDate: Date;
  goLiveDate?: Date;
  rating?: string;
  secondOwnerId?: string;
  stageHistory: unknown[];
};

// ─── Stage normalisation map ──────────────────────────────────────────────────
// Salesforce uses various stage names — normalise to dashboard enum values.
const STAGE_MAP: Record<string, string> = {
  'prospecting':           'Discovery',
  'discovery':             'Discovery',
  'qualification':         'Scoping',
  'scoping':               'Scoping',
  'value proposition':     'Proposal',
  'proposal/price quote':  'Proposal',
  'proposal':              'Proposal',
  'id decision makers':    'Negotiation',
  'negotiation/review':    'Negotiation',
  'negotiation':           'Negotiation',
  'closed won':            'Closed Won',
  'closed lost':           'Closed Lost',
};

function normaliseStage(raw: string): string {
  return STAGE_MAP[raw.toLowerCase().trim()] ?? raw;
}

// ─── Type normalisation ───────────────────────────────────────────────────────
function normaliseType(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('existing') || lower.includes('expansion') || lower.includes('upsell')) {
    return 'Expansion';
  }
  if (lower.includes('renewal')) return 'Renewal';
  return 'New Logo';
}

// ─── Rating inference from Forecast Category ─────────────────────────────────
function inferRating(forecastCategory: string): string {
  const lower = forecastCategory.toLowerCase();
  if (lower.includes('commit') || lower.includes('closed')) return 'Hot';
  if (lower.includes('best') || lower.includes('likely'))   return 'Warm';
  return 'Cold';
}

function parseAmount(val: unknown): number {
  const n = parseFloat(String(val ?? '0').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * mapOpportunities
 *
 * accountId and salesRepId are set to the raw string values (alias / name)
 * at this stage. The calling script should resolve them to database IDs after
 * upserting User and Account records.
 */
export function mapOpportunities(
  rows: Record<string, unknown>[]
): OpportunityCreateInput[] {
  const results: OpportunityCreateInput[] = [];

  for (const row of rows) {
    const accountAlias = String(row['Account Name'] ?? row['Account'] ?? '').trim();
    if (!accountAlias) continue;

    const rawStage = String(row['Stage'] ?? '').trim();
    const stage    = normaliseStage(rawStage);

    const baseRevenue    = parseAmount(row['Amount'] ?? row['Base MNR']);
    const rollRevenue    = parseAmount(row['Roll Amount'] ?? row['Roll MNR']);
    const stageProbMap: Record<string, number> = {
      'Discovery': 0.10, 'Scoping': 0.20, 'Proposal': 0.40,
      'Negotiation': 0.70, 'Closed Won': 1.0, 'Closed Lost': 0,
    };
    const prob           = stageProbMap[stage] ?? 0.1;
    const weightedMNR    = parseAmount(row['Weighted Amount']) || baseRevenue * prob;

    const closeDate = parseDate(row['Close Date']);
    if (!closeDate) continue; // skip rows without a close date

    results.push({
      accountId:          accountAlias,   // placeholder — resolve after account upsert
      salesRepId:         String(row['Owner'] ?? '').trim() || 'UNKNOWN',
      stage,
      type:               normaliseType(String(row['Type'] ?? 'New Business')),
      baseMonthlyRevenue: baseRevenue,
      rollMonthlyRevenue: rollRevenue,
      weightedExpectedMNR: weightedMNR,
      closeDate,
      goLiveDate:         parseDate(row['Go-Live Date']),
      rating:             inferRating(String(row['Forecast Category'] ?? '')),
      secondOwnerId:      String(row['Second Owner'] ?? '').trim() || undefined,
      stageHistory:       [],
    });
  }

  return results;
}
