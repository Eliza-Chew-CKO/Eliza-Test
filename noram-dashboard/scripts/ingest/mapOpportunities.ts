/**
 * mapOpportunities.ts
 *
 * Maps rows from the "Salesforce Opportunity Snapshot" sheet to
 * Prisma OpportunityCreateInput objects.
 *
 * Expected sheet columns:
 *   - "Opportunity ID"         → used as external reference (not stored as PK)
 *   - "Account Name"           → matched to Account.alias
 *   - "Owner"                  → matched to User (salesRepId)
 *   - "Stage"                  → opportunity.stage (normalised)
 *   - "Type"                   → opportunity.type (New Logo | Expansion | Renewal)
 *   - "Base MNR"               → opportunity.baseMonthlyRevenue
 *   - "Roll MNR"               → opportunity.rollMonthlyRevenue
 *   - "Weighted MNR"           → opportunity.weightedExpectedMNR
 *   - "Close Date"             → opportunity.closeDate
 *   - "Go Live Date"           → opportunity.goLiveDate
 *   - "Rating"                 → opportunity.rating
 *   - "Second Owner"           → opportunity.secondOwnerId (nullable)
 */

import type { Prisma } from '@prisma/client';
import type { SheetRow } from './parseExcel';

// ─── Column constants ─────────────────────────────────────────────────────────
const COL_ACCOUNT   = 'Account Name';
const COL_OWNER     = 'Owner';
const COL_STAGE     = 'Stage';
const COL_TYPE      = 'Type';
const COL_BASE_MNR  = 'Base MNR';
const COL_ROLL_MNR  = 'Roll MNR';
const COL_WTDD_MNR  = 'Weighted MNR';
const COL_CLOSE     = 'Close Date';
const COL_GOLIVE    = 'Go Live Date';
const COL_RATING    = 'Rating';
const COL_SECOND    = 'Second Owner';

// ─── Stage normalisation ──────────────────────────────────────────────────────

const STAGE_MAP: Record<string, string> = {
  'discovery':           'Discovery',
  'scoping':             'Scoping',
  'proposal':            'Proposal',
  'proposal/price quote':'Proposal',
  'negotiation':         'Negotiation',
  'negotiation/review':  'Negotiation',
  'closed won':          'Closed Won',
  'closed lost':         'Closed Lost',
  'value proposition':   'Proposal',
  'id. decision makers': 'Discovery',
  'perception analysis': 'Scoping',
  'needs analysis':      'Scoping',
};

function normaliseStage(raw: string | null | undefined): string {
  if (!raw) return 'Discovery';
  return STAGE_MAP[raw.toString().toLowerCase().trim()] ?? raw.toString().trim();
}

// ─── Type detection ───────────────────────────────────────────────────────────

function normaliseType(raw: string | null | undefined): string {
  if (!raw) return 'New Logo';
  const lower = raw.toString().toLowerCase().trim();
  if (lower.includes('expansion') || lower.includes('upsell')) return 'Expansion';
  if (lower.includes('renewal'))  return 'Renewal';
  return 'New Logo';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCurrency(raw: any): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') return raw;
  // Remove currency symbols, commas, and whitespace
  const cleaned = raw.toString().replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function parseDate(raw: any): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return raw;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

/**
 * Maps Salesforce opportunity snapshot rows to OpportunityCreateInput objects.
 * accountId and salesRepId are stored as placeholder strings (alias/email)
 * and must be resolved to DB IDs before the upsert.
 */
export function mapOpportunities(rows: SheetRow[]): Prisma.OpportunityUncheckedCreateInput[] {
  const mapped: Prisma.OpportunityUncheckedCreateInput[] = [];

  for (const row of rows) {
    const accountAlias = row[COL_ACCOUNT]?.toString().trim();
    const owner        = row[COL_OWNER]?.toString().trim();

    if (!accountAlias || !owner) {
      console.warn('[mapOpportunities] Skipping row missing account or owner:', row);
      continue;
    }

    const closeDate = parseDate(row[COL_CLOSE]);
    if (!closeDate) {
      console.warn('[mapOpportunities] Skipping row with invalid close date:', row);
      continue;
    }

    const base     = parseCurrency(row[COL_BASE_MNR]);
    const roll     = parseCurrency(row[COL_ROLL_MNR]);
    const weighted = parseCurrency(row[COL_WTDD_MNR]) || base * 0.5; // fallback

    mapped.push({
      accountId:            accountAlias, // resolved to Account.id at upsert time
      salesRepId:           owner,        // resolved to User.id at upsert time
      stage:                normaliseStage(row[COL_STAGE]),
      type:                 normaliseType(row[COL_TYPE]),
      baseMonthlyRevenue:   base,
      rollMonthlyRevenue:   roll,
      weightedExpectedMNR:  weighted,
      closeDate,
      goLiveDate:           parseDate(row[COL_GOLIVE]) ?? undefined,
      rating:               row[COL_RATING]?.toString().trim() || null,
      secondOwnerId:        row[COL_SECOND]?.toString().trim() || null,
      stageHistory:         [],
    });
  }

  return mapped;
}
