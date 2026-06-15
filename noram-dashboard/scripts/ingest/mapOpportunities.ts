/**
 * mapOpportunities.ts
 *
 * Maps rows from the "Salesforce Opportunity Snapshot" sheet to
 * Prisma OpportunityCreateInput objects.
 *
 * Expected sheet columns:
 *   Opportunity ID      — Salesforce opportunity ID
 *   Account ID / Name   — linked account alias or ID
 *   Owner (AE)          — primary sales rep name or ID
 *   Stage               — pipeline stage (raw Salesforce stage name)
 *   Type                — "New Logo" | "Expansion" | "Renewal" | etc.
 *   Base MNR            — base monthly new revenue (numeric)
 *   Roll MNR            — roll monthly new revenue (numeric)
 *   Close Date          — expected close date
 *   Go-Live Date        — expected go-live date (optional)
 *   Rating              — deal rating "A" | "B" | "C"
 *   Second Owner        — secondary rep ID (optional)
 */

export interface OpportunityCreateInput {
  id?: string;
  accountId: string;
  salesRepId: string;
  stage: string;
  type: string;
  baseMonthlyRevenue: number;
  rollMonthlyRevenue: number;
  weightedExpectedMNR: number;
  closeDate: Date;
  goLiveDate?: Date | null;
  rating?: string | null;
  secondOwnerId?: string | null;
  stageHistory: Array<{ stage: string; enteredAt: string }>;
}

// ─── Stage normalisation ──────────────────────────────────────────────────────

// Maps raw Salesforce stage names to our internal stage taxonomy
const STAGE_MAP: Record<string, string> = {
  'discovery':              'Discovery',
  'scoping':                'Scoping',
  'solution scoping':       'Scoping',
  'proposal':               'Proposal',
  'value proposition':      'Proposal',
  'negotiation':            'Negotiation',
  'negotiation/review':     'Negotiation',
  'closed won':             'Closed Won',
  'closed lost':            'Closed Lost',
  'id. decision makers':    'Discovery',
  'perception analysis':    'Scoping',
};

function normaliseStage(raw: string): string {
  return STAGE_MAP[raw.toLowerCase().trim()] ?? raw.trim();
}

// ─── Type detection ────────────────────────────────────────────────────────────

function normaliseType(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('new logo') || lower.includes('new business')) return 'New Logo';
  if (lower.includes('expansion') || lower.includes('upsell'))      return 'Expansion';
  if (lower.includes('renewal'))                                      return 'Renewal';
  return raw.trim() || 'New Logo';
}

// ─── Stage weights for weighted MNR ───────────────────────────────────────────

const STAGE_WEIGHTS: Record<string, number> = {
  Discovery:    0.10,
  Scoping:      0.25,
  Proposal:     0.50,
  Negotiation:  0.75,
  'Closed Won': 1.00,
  'Closed Lost': 0.00,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function get(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key] ??
      Object.entries(row).find(([k]) => k.trim().toLowerCase() === key.toLowerCase())?.[1];
    if (val != null) return String(val).trim();
  }
  return '';
}

function parseNum(raw: unknown): number {
  if (raw == null) return 0;
  const n = parseFloat(String(raw).replace(/[,$]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseDate(raw: unknown): Date | null {
  if (!raw) return null;
  const d = new Date(String(raw).trim());
  return isNaN(d.getTime()) ? null : d;
}

// ─── Main mapper ──────────────────────────────────────────────────────────────

/**
 * mapOpportunities
 *
 * Maps raw rows to OpportunityCreateInput.
 * Rows missing accountId or a valid close date are skipped.
 * weightedExpectedMNR is calculated from baseMonthlyRevenue × stage weight.
 */
export function mapOpportunities(
  rows: Record<string, unknown>[]
): OpportunityCreateInput[] {
  const results: OpportunityCreateInput[] = [];

  for (const row of rows) {
    const accountId  = get(row, 'Account ID', 'Account', 'Account Name', 'Account Alias');
    const salesRepId = get(row, 'Owner', 'Owner (AE)', 'AE', 'Sales Rep', 'Sales Rep ID');

    if (!accountId) {
      console.warn('[mapOpportunities] Skipping row with no account ID', row);
      continue;
    }

    const rawStage     = get(row, 'Stage', 'Pipeline Stage');
    const stage        = normaliseStage(rawStage);
    const type         = normaliseType(get(row, 'Type', 'Opportunity Type'));
    const baseMNR      = parseNum(row['Base MNR'] ?? row['Base Monthly Revenue']);
    const rollMNR      = parseNum(row['Roll MNR'] ?? row['Roll Monthly Revenue']);
    const weight       = STAGE_WEIGHTS[stage] ?? 0.5;
    const weightedMNR  = baseMNR * weight;

    const closeDateRaw = row['Close Date'] ?? row['Expected Close Date'];
    const closeDate    = parseDate(closeDateRaw);
    if (!closeDate) {
      console.warn(`[mapOpportunities] Skipping row with invalid close date: "${closeDateRaw}"`);
      continue;
    }

    const goLiveDate = parseDate(row['Go-Live Date'] ?? row['Go Live Date']);
    const rating     = get(row, 'Rating', 'Deal Rating') || null;
    const secondOwner = get(row, 'Second Owner', 'Secondary Owner') || null;
    const oppId      = get(row, 'Opportunity ID', 'Id', 'SF ID') || undefined;

    results.push({
      id: oppId,
      accountId,
      salesRepId: salesRepId || 'UNKNOWN',
      stage,
      type,
      baseMonthlyRevenue:  baseMNR,
      rollMonthlyRevenue:  rollMNR,
      weightedExpectedMNR: weightedMNR,
      closeDate,
      goLiveDate:          goLiveDate ?? null,
      rating,
      secondOwnerId:       secondOwner,
      stageHistory: [
        { stage, enteredAt: new Date().toISOString() },
      ],
    });
  }

  return results;
}
