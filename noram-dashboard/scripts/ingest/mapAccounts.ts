/**
 * mapAccounts.ts
 *
 * Maps account rows to Prisma AccountCreateInput objects.
 *
 * Accounts are typically derived from the "Data" sheet where each row
 * represents a monthly financial record for an account. We deduplicate
 * by account alias to produce one insert per unique account.
 *
 * Expected columns (from "Data" sheet):
 *   - Account Alias / Account Name  : Display name for the account
 *   - Tier                           : "Enterprise", "Mid-Market", "SMB", or inferred from revenue
 *   - Managed                        : "Y" / "Yes" / true for managed accounts
 *   - Go Live Date                   : ISO or Excel serial date of go-live
 *   - Region                         : Geographic region string
 *   - Referral Partner               : Optional partner name
 *   - Sector / Industry              : Optional vertical
 *   - Sales Rep Email                : Used to look up User.id (resolved at insert time)
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

// Column constants
const COL_ALIAS = 'Account Alias';
const COL_TIER = 'Tier';
const COL_MANAGED = 'Managed';
const COL_GO_LIVE = 'Go Live Date';
const COL_REGION = 'Region';
const COL_REFERRAL = 'Referral Partner';
const COL_SECTOR = 'Sector';
const COL_SALES_REP = 'Sales Rep Email';

type TierLabel = 'Enterprise' | 'Mid-Market' | 'SMB';

/**
 * inferTier
 * Maps common tier string variants to the canonical three-level taxonomy.
 */
function inferTier(raw: string | null | undefined): TierLabel {
  if (!raw) return 'SMB';
  const normalised = raw.trim().toLowerCase();
  if (normalised.includes('enterprise') || normalised.includes('ent')) return 'Enterprise';
  if (normalised.includes('mid') || normalised.includes('mm')) return 'Mid-Market';
  return 'SMB';
}

/**
 * parseManagedFlag
 * Converts a variety of truthy representations to a boolean.
 */
function parseManagedFlag(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['y', 'yes', 'true', '1'].includes(value.trim().toLowerCase());
  }
  return false;
}

/**
 * mapAccounts
 *
 * @param rows  Raw row objects from the "Data" sheet
 * @returns     Deduplicated array of Prisma.AccountCreateInput objects
 *
 * Note: salesRepId is set to a placeholder — at insert time, resolve it
 * by looking up User.id WHERE email = row[COL_SALES_REP].
 */
export function mapAccounts(rows: Record<string, any>[]): Prisma.AccountCreateInput[] {
  const seen = new Set<string>();
  const results: Prisma.AccountCreateInput[] = [];

  for (const row of rows) {
    const alias = (row[COL_ALIAS] as string | null)?.trim();
    if (!alias) continue;
    if (seen.has(alias)) continue; // deduplicate
    seen.add(alias);

    const goLiveDateRaw = row[COL_GO_LIVE];
    let goLiveDate: Date | null = null;
    if (goLiveDateRaw) {
      goLiveDate = parseExcelDate(goLiveDateRaw);
    }

    results.push({
      alias,
      tier: inferTier(row[COL_TIER] as string | null),
      isManaged: parseManagedFlag(row[COL_MANAGED]),
      goLiveDate,
      region: (row[COL_REGION] as string | null)?.trim() ?? 'NORAM',
      referralPartner: (row[COL_REFERRAL] as string | null)?.trim() ?? null,
      sector: (row[COL_SECTOR] as string | null)?.trim() ?? null,
      // salesRep must be connected by ID — use a placeholder string that
      // the caller resolves after upserting users.
      salesRep: { connect: { email: (row[COL_SALES_REP] as string | null)?.trim() ?? '' } },
    });
  }

  return results;
}
