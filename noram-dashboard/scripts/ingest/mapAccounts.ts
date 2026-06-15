/**
 * mapAccounts.ts
 *
 * Maps account-level rows (typically from the "Data" sheet) to Prisma
 * AccountCreateInput objects.
 *
 * Accounts are not an explicit sheet — they are inferred from the account
 * alias column in the "Data" sheet. Deduplication is handled by the upsert
 * logic in parseExcel.ts (upsert on alias).
 *
 * Column mapping (from "Data" sheet):
 *   Account / Alias     → alias
 *   Tier                → tier (with inference if missing)
 *   Managed (Y/N)       → isManaged (boolean)
 *   Go-Live Date        → goLiveDate
 *   Region              → region
 *   Referral Partner    → referralPartner
 *   Sector / Vertical   → sector
 *   Sales Rep           → salesRepId (resolved via user lookup by name/email)
 *   Account Manager     → accountManagerId
 */

type AccountCreateInput = {
  alias: string;
  tier: string;
  isManaged: boolean;
  salesRepId: string;
  accountManagerId?: string;
  goLiveDate?: Date;
  region: string;
  referralPartner?: string;
  sector?: string;
};

function str(row: Record<string, unknown>, col: string): string {
  const val = row[col];
  return typeof val === 'string' ? val.trim() : String(val ?? '').trim();
}

/**
 * Infer account tier from alias, revenue signals, or explicit column.
 * Priority: explicit column value > revenue heuristic > default 'SMB'
 */
function inferTier(row: Record<string, unknown>): string {
  const explicit = str(row, 'Tier');
  if (['Enterprise', 'Mid-Market', 'SMB'].includes(explicit)) return explicit;

  // Heuristic: high-value accounts tagged as Enterprise
  const revenueStr = str(row, 'Net Revenue') || str(row, 'Total Fees');
  const revenue = parseFloat(revenueStr.replace(/[^0-9.-]/g, ''));
  if (!isNaN(revenue)) {
    if (revenue >= 50_000) return 'Enterprise';
    if (revenue >= 10_000) return 'Mid-Market';
  }

  return 'SMB';
}

function parseDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? undefined : d;
}

function parseBoolean(val: unknown): boolean {
  const s = String(val ?? '').trim().toLowerCase();
  return s === 'y' || s === 'yes' || s === 'true' || s === '1';
}

/**
 * mapAccounts
 *
 * Deduplicates by alias (last row wins for a given alias).
 * salesRepId is set to a placeholder — in production, resolve via a
 * name→id lookup against the users already upserted from "NORAM Users - AW".
 */
export function mapAccounts(rows: Record<string, unknown>[]): AccountCreateInput[] {
  const seen = new Map<string, AccountCreateInput>();

  for (const row of rows) {
    const alias = str(row, 'Account') || str(row, 'Alias') || str(row, 'Account Name');
    if (!alias) continue;

    seen.set(alias, {
      alias,
      tier: inferTier(row),
      isManaged: parseBoolean(row['Managed']),
      salesRepId: str(row, 'Sales Rep') || str(row, 'Rep') || 'UNKNOWN',
      accountManagerId: str(row, 'Account Manager') || undefined,
      goLiveDate: parseDate(row['Go-Live Date'] ?? row['Go Live Date']),
      region: str(row, 'Region') || 'NORAM',
      referralPartner: str(row, 'Referral Partner') || undefined,
      sector: str(row, 'Sector') || str(row, 'Vertical') || undefined,
    });
  }

  return Array.from(seen.values());
}
