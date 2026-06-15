/**
 * mapOpportunities.ts
 *
 * Maps rows from the "Salesforce Opportunity Snapshot" Excel sheet to
 * Opportunity create objects suitable for Prisma upsert.
 *
 * Expected sheet columns:
 *   - "Opportunity ID" or "SF ID"              → used as the source ID reference
 *   - "Account" or "Account Name"              → accountId reference (by alias)
 *   - "Owner" or "Rep" or "AE"                 → salesRepId reference
 *   - "Stage" or "Opportunity Stage"           → stage (normalised)
 *   - "Type" or "Opportunity Type"             → type (New Logo / Expansion)
 *   - "Base MNR" or "Base Monthly Revenue"     → baseMonthlyRevenue
 *   - "Roll MNR" or "Roll Monthly Revenue"     → rollMonthlyRevenue
 *   - "Weighted MNR" or "Expected MNR"         → weightedExpectedMNR
 *   - "Close Date"                             → closeDate
 *   - "Go Live" or "Go-Live Date"              → goLiveDate (optional)
 *   - "Rating"                                 → rating
 *   - "Second Owner" or "Co-Owner"             → secondOwnerId (optional)
 */

export interface OpportunityCreateInput {
  accountId:           string;  // Will be resolved to Account.id by alias
  salesRepId:          string;  // Will be resolved to User.id by name/email
  stage:               string;
  type:                string;
  baseMonthlyRevenue:  number;
  rollMonthlyRevenue:  number;
  weightedExpectedMNR: number;
  closeDate:           Date;
  goLiveDate:          Date | null;
  rating:              string | null;
  secondOwnerId:       string | null;
  stageHistory:        unknown[];
}

function resolveColumn(row: Record<string, unknown>, candidates: string[]): string {
  for (const col of candidates) {
    const val = row[col];
    if (val !== null && val !== undefined && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

function parseDate(raw: unknown): Date | null {
  if (!raw) return null;
  if (typeof raw === 'number') {
    // Excel serial date
    const d = new Date((raw - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(String(raw));
  return isNaN(d.getTime()) ? null : d;
}

function parseMoney(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  const str = String(raw ?? '').replace(/[$,\s]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normalise Salesforce stage names to the dashboard's canonical stage values.
 * Adjust mappings based on the actual stage names used in your Salesforce instance.
 */
function normaliseStage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('discover'))   return 'Discovery';
  if (lower.includes('scop'))       return 'Scoping';
  if (lower.includes('proposal'))   return 'Proposal';
  if (lower.includes('negot'))      return 'Negotiation';
  if (lower.includes('won'))        return 'Closed Won';
  if (lower.includes('lost'))       return 'Closed Lost';
  return raw;
}

/**
 * Infer opportunity type from stage, description, or explicit type column.
 */
function inferType(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('expansion') || lower.includes('upsell')) return 'Expansion';
  if (lower.includes('renewal'))                                return 'Renewal';
  return 'New Logo';
}

/**
 * mapOpportunities
 *
 * Converts raw Salesforce Opportunity Snapshot rows into OpportunityCreateInput objects.
 * Rows missing a close date are skipped.
 *
 * @param rows - Raw row objects from xlsx.utils.sheet_to_json
 * @returns Array of OpportunityCreateInput objects
 */
export function mapOpportunities(rows: Record<string, unknown>[]): OpportunityCreateInput[] {
  const mapped: OpportunityCreateInput[] = [];

  for (const row of rows) {
    const closeDateRaw = row['Close Date'] ?? row['CloseDate'] ?? row['Expected Close'];
    const closeDate    = parseDate(closeDateRaw);

    if (!closeDate) {
      // Close date is required — skip malformed rows
      continue;
    }

    const accountAlias = resolveColumn(row, ['Account', 'Account Name', 'Merchant']);
    const repName      = resolveColumn(row, ['Owner', 'Rep', 'AE', 'Sales Rep']);
    const stageRaw     = resolveColumn(row, ['Stage', 'Opportunity Stage', 'Sales Stage']);
    const typeRaw      = resolveColumn(row, ['Type', 'Opportunity Type', 'Deal Type']);

    mapped.push({
      accountId:           accountAlias || 'UNKNOWN',
      salesRepId:          repName      || 'UNKNOWN',
      stage:               normaliseStage(stageRaw),
      type:                inferType(typeRaw || stageRaw),
      baseMonthlyRevenue:  parseMoney(row['Base MNR'] ?? row['Base Monthly Revenue']),
      rollMonthlyRevenue:  parseMoney(row['Roll MNR'] ?? row['Roll Monthly Revenue']),
      weightedExpectedMNR: parseMoney(row['Weighted MNR'] ?? row['Expected MNR'] ?? row['Weighted Expected MNR']),
      closeDate,
      goLiveDate:          parseDate(row['Go Live'] ?? row['Go-Live Date'] ?? null),
      rating:              resolveColumn(row, ['Rating', 'Opportunity Rating']) || null,
      secondOwnerId:       resolveColumn(row, ['Second Owner', 'Co-Owner', 'Co-AE']) || null,
      stageHistory:        [],
    });
  }

  return mapped;
}
