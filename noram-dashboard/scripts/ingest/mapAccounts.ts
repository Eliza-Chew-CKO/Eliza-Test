/**
 * mapAccounts.ts
 *
 * Maps rows from the "Data" sheet to Prisma AccountCreateInput objects.
 *
 * Accounts are not stored in a dedicated sheet; they are inferred from the
 * account/alias columns in the "Data" revenue sheet.
 *
 * Expected columns from "Data":
 *   Account Alias      — display name / internal alias
 *   Tier               — account tier: "Enterprise" | "Mid-Market" | "SMB"
 *   Managed            — "Y" / "N" / true / false indicating account management status
 *   Sales Rep          — name or ID of the owning AE
 *   Account Manager    — name or ID of the AM (optional)
 *   Go Live Date       — date the account went live on Checkout.com
 *   Region             — geographic region
 *   Referral Partner   — referring partner name (optional)
 *   Sector             — merchant industry sector (optional)
 */

export interface AccountCreateInput {
  alias: string;
  tier: string;
  isManaged: boolean;
  salesRepId: string;
  accountManagerId?: string | null;
  goLiveDate?: Date | null;
  region: string;
  referralPartner?: string | null;
  sector?: string | null;
}

// ─── Tier inference ────────────────────────────────────────────────────────────

const TIER_KEYWORDS: Array<{ keywords: string[]; tier: string }> = [
  { keywords: ['enterprise', 'ent'],           tier: 'Enterprise' },
  { keywords: ['mid-market', 'mid market', 'mm'], tier: 'Mid-Market' },
  { keywords: ['smb', 'small'],                 tier: 'SMB' },
];

function inferTier(raw: string): string {
  const lower = raw.toLowerCase().trim();
  for (const { keywords, tier } of TIER_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return tier;
  }
  // Default to Mid-Market if unrecognised
  console.warn(`[mapAccounts] Unrecognised tier "${raw}" — defaulting to Mid-Market`);
  return 'Mid-Market';
}

// ─── Date parsing ──────────────────────────────────────────────────────────────

function parseDate(raw: unknown): Date | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Boolean parsing ───────────────────────────────────────────────────────────

function parseBool(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  const str = String(raw).toLowerCase().trim();
  return str === 'y' || str === 'yes' || str === 'true' || str === '1';
}

// ─── Column helpers ────────────────────────────────────────────────────────────

function get(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key] ??
      Object.entries(row).find(([k]) => k.trim().toLowerCase() === key.toLowerCase())?.[1];
    if (val != null) return String(val).trim();
  }
  return '';
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * mapAccounts
 *
 * Extracts unique accounts from "Data" sheet rows.
 * Deduplicates by alias — last seen row wins for mutable fields.
 */
export function mapAccounts(rows: Record<string, unknown>[]): AccountCreateInput[] {
  const seen = new Map<string, AccountCreateInput>();

  for (const row of rows) {
    const alias = get(row, 'Account Alias', 'Account', 'Alias');
    if (!alias) {
      console.warn('[mapAccounts] Skipping row with no account alias');
      continue;
    }

    const tierRaw     = get(row, 'Tier', 'Account Tier');
    const managedRaw  = row['Managed'] ?? row['Is Managed'] ?? 'N';
    const salesRep    = get(row, 'Sales Rep', 'Sales Rep ID', 'AE');
    const acctManager = get(row, 'Account Manager', 'AM', 'Account Manager ID') || null;
    const goLiveRaw   = row['Go Live Date'] ?? row['Go-Live Date'];
    const region      = get(row, 'Region', 'Sales Region');
    const partner     = get(row, 'Referral Partner', 'Partner') || null;
    const sector      = get(row, 'Sector', 'Industry') || null;

    seen.set(alias, {
      alias,
      tier:            inferTier(tierRaw || 'Mid-Market'),
      isManaged:       parseBool(managedRaw),
      salesRepId:      salesRep,
      accountManagerId: acctManager,
      goLiveDate:      parseDate(goLiveRaw),
      region:          region || 'NORAM',
      referralPartner: partner,
      sector,
    });
  }

  return Array.from(seen.values());
}
