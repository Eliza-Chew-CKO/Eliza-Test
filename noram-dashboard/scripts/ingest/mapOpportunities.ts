/**
 * mapOpportunities.ts
 *
 * Maps rows from the "Salesforce Opportunity Snapshot" Excel sheet to
 * Prisma OpportunityCreateInput objects.
 *
 * Expected sheet columns:
 *   - Opportunity ID         : Salesforce opportunity ID (used as stable external ID)
 *   - Account Name           : Matched to Account.alias for connect
 *   - Owner Email            : Sales rep email — connected to User
 *   - Stage                  : Salesforce stage name (normalised to canonical values)
 *   - Type                   : "New Business" / "Existing Business" (mapped to type enum)
 *   - Base MNR               : Numeric monthly revenue (base)
 *   - Roll MNR / ARR         : Numeric monthly revenue (roll-on)
 *   - Weighted MNR           : Pre-calculated weighted value (or computed from stage)
 *   - Close Date             : Expected close date
 *   - Go Live Date           : Expected go-live date
 *   - Rating                 : "Hot" | "Warm" | "Cold" (or Salesforce forecast category)
 *   - Second Owner Email     : Optional co-owner email
 */

import type { Prisma } from '@prisma/client';
/**
 * parseExcelDate — converts Excel serial numbers, ISO strings, and Date objects to Date.
 * Excel serial numbers count days from 1900-01-01 with the Lotus 1-2-3 leap year bug
 * (1900 is treated as a leap year, so serials > 60 are shifted by 2 days).
 */
function parseExcelDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const excelEpoch = new Date(1900, 0, 1);
    const days = value > 60 ? value - 2 : value - 1;
    return new Date(excelEpoch.getTime() + days * 86_400_000);
  }
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? null : d;
}

// Stage probability map for computing weighted MNR if not provided
const STAGE_WIN_PROBABILITY: Record<string, number> = {
  Discovery: 0.1,
  Scoping: 0.25,
  Proposal: 0.4,
  Negotiation: 0.75,
  'Closed Won': 1.0,
  'Closed Lost': 0.0,
};

// Map Salesforce stage names to canonical dashboard stages
const STAGE_MAP: Record<string, string> = {
  'Needs Analysis': 'Discovery',
  'Qualification': 'Discovery',
  'Value Proposition': 'Scoping',
  'Id. Decision Makers': 'Scoping',
  'Perception Analysis': 'Scoping',
  'Proposal/Price Quote': 'Proposal',
  'Negotiation/Review': 'Negotiation',
  'Closed Won': 'Closed Won',
  'Closed Lost': 'Closed Lost',
};

/**
 * normaliseStage
 * Maps Salesforce stage names to canonical stages, defaulting to 'Discovery'.
 */
function normaliseStage(raw: string | null | undefined): string {
  if (!raw) return 'Discovery';
  return STAGE_MAP[raw.trim()] ?? raw.trim();
}

/**
 * normaliseType
 * Maps Salesforce opportunity types to canonical dashboard types.
 */
function normaliseType(raw: string | null | undefined): string {
  if (!raw) return 'New Logo';
  const lower = raw.toLowerCase();
  if (lower.includes('existing') || lower.includes('expansion') || lower.includes('upsell')) {
    return 'Expansion';
  }
  if (lower.includes('renewal')) return 'Renewal';
  return 'New Logo';
}

/**
 * parseDecimal
 * Safely parses a numeric value from a cell (handles strings with currency symbols).
 */
function parseDecimal(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,£€\s]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/**
 * mapOpportunities
 *
 * @param rows  Raw row objects from the "Salesforce Opportunity Snapshot" sheet
 * @returns     Array of Prisma.OpportunityCreateInput objects
 */
export function mapOpportunities(rows: Record<string, any>[]): Prisma.OpportunityCreateInput[] {
  const results: Prisma.OpportunityCreateInput[] = [];

  for (const row of rows) {
    const accountName = (row['Account Name'] as string | null)?.trim();
    const ownerEmail = (row['Owner Email'] as string | null)?.trim();
    const closeDateRaw = row['Close Date'];

    if (!accountName || !closeDateRaw) {
      console.warn('[mapOpportunities] Skipping row — missing Account Name or Close Date');
      continue;
    }

    const stage = normaliseStage(row['Stage'] as string | null);
    const base = parseDecimal(row['Base MNR'] ?? row['Monthly Revenue']);
    const roll = parseDecimal(row['Roll MNR'] ?? row['ARR'] ?? 0);
    const probability = STAGE_WIN_PROBABILITY[stage] ?? 0.1;
    const weighted = parseDecimal(row['Weighted MNR']) || (base + roll) * probability;

    results.push({
      account: { connect: { alias: accountName } },
      salesRep: { connect: { email: ownerEmail ?? '' } },
      stage,
      type: normaliseType(row['Type'] as string | null),
      baseMonthlyRevenue: base,
      rollMonthlyRevenue: roll,
      weightedExpectedMNR: Math.round(weighted * 100) / 100,
      closeDate: parseExcelDate(closeDateRaw) ?? new Date(),
      goLiveDate: row['Go Live Date'] ? parseExcelDate(row['Go Live Date']) : null,
      rating: (row['Rating'] as string | null)?.trim() ?? null,
      secondOwnerId: null, // resolve from secondOwnerEmail after user upserts
      stageHistory: [],
    });
  }

  return results;
}
