/**
 * mapAccounts.ts
 *
 * Maps account data rows to Prisma AccountCreateInput objects.
 *
 * Accounts are derived from the "Data" sheet (financial actuals) since there
 * is no dedicated Account sheet in the source workbook. Each unique account
 * alias encountered in the Data sheet produces one Account record.
 *
 * Expected relevant columns in the "Data" sheet:
 *   - "Account" / "Account Alias"  → account.alias
 *   - "Tier"                       → account.tier
 *   - "Managed"                    → account.isManaged (boolean)
 *   - "Sales Rep"                  → account.salesRepId (matched to User.email)
 *   - "Account Manager"            → account.accountManagerId (nullable)
 *   - "Go Live Date"               → account.goLiveDate
 *   - "Region"                     → account.region
 *   - "Referral Partner"           → account.referralPartner
 *   - "Sector"                     → account.sector
 */

import type { Prisma } from '@prisma/client';
import type { SheetRow } from './parseExcel';

// ─── Column name constants ────────────────────────────────────────────────────
const COL_ALIAS   = 'Account';
const COL_TIER    = 'Tier';
const COL_MANAGED = 'Managed';
const COL_REP     = 'Sales Rep';
const COL_AM      = 'Account Manager';
const COL_GOLIVE  = 'Go Live Date';
const COL_REGION  = 'Region';
const COL_PARTNER = 'Referral Partner';
const COL_SECTOR  = 'Sector';

// ─── Tier inference ───────────────────────────────────────────────────────────

/**
 * Infers account tier from a raw string value.
 * Falls back to 'SMB' if not recognisable.
 */
function normaliseTier(raw: string | null | undefined): string {
  if (!raw) return 'SMB';
  const lower = raw.toString().toLowerCase().trim();
  if (lower.includes('enterprise'))  return 'Enterprise';
  if (lower.includes('mid'))         return 'Mid-Market';
  if (lower.includes('smb') || lower.includes('small')) return 'SMB';
  return raw.toString().trim();
}

function parseBoolean(raw: any): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    return ['yes', 'true', '1', 'y'].includes(raw.toLowerCase().trim());
  }
  if (typeof raw === 'number') return raw === 1;
  return false;
}

function parseDate(raw: any): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return raw;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

/**
 * Deduplicates and maps account rows to AccountCreateInput objects.
 * Uses salesRepId as a placeholder string (email or name) — the actual DB
 * ID must be resolved via upsert lookups at insert time.
 *
 * @param rows - Rows from the "Data" sheet
 */
export function mapAccounts(rows: SheetRow[]): Prisma.AccountUncheckedCreateInput[] {
  const seen = new Set<string>();
  const accounts: Prisma.AccountUncheckedCreateInput[] = [];

  for (const row of rows) {
    const alias = row[COL_ALIAS]?.toString().trim();
    if (!alias || seen.has(alias)) continue;
    seen.add(alias);

    const goLiveDate = parseDate(row[COL_GOLIVE]);

    accounts.push({
      alias,
      tier:            normaliseTier(row[COL_TIER]),
      isManaged:       parseBoolean(row[COL_MANAGED]),
      // salesRepId is stored as the rep's email/name here; the upsert script
      // must resolve this to the actual User.id before inserting.
      salesRepId:      row[COL_REP]?.toString().trim() ?? 'UNKNOWN',
      accountManagerId: row[COL_AM]?.toString().trim() || null,
      goLiveDate:      goLiveDate ?? undefined,
      region:          row[COL_REGION]?.toString().trim() ?? 'NORAM',
      referralPartner: row[COL_PARTNER]?.toString().trim() || null,
      sector:          row[COL_SECTOR]?.toString().trim() || null,
    });
  }

  return accounts;
}
