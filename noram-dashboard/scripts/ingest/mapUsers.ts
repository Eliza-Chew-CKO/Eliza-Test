/**
 * mapUsers.ts
 *
 * Maps rows from the "NORAM Users - AW" Excel sheet to Prisma UserCreateInput objects.
 *
 * Expected sheet columns (case-insensitive matching):
 *   Name         — full name of the sales rep or account manager
 *   Email        — work email address (must be unique)
 *   Role         — e.g. "AE", "AM", "Sales Manager", "VP Sales"
 *   Sales Region — e.g. "US-East", "US-West", "US-Central", "Canada"
 *
 * Notes:
 *   - Rows with missing Email are skipped (email is the natural key).
 *   - Name is trimmed; Role defaults to "AE" if blank.
 *   - The sheet may include both AEs (Account Executives) and AMs (Account Managers).
 */

// TODO: import type { Prisma } from '@noram/db';
// Using a local type alias until the package is installed
type UserCreateInput = {
  id?: string;
  name: string;
  email: string;
  role: string;
  salesRegion: string;
};

// ─── Column name constants ────────────────────────────────────────────────────
const COL_NAME   = 'Name';
const COL_EMAIL  = 'Email';
const COL_ROLE   = 'Role';
const COL_REGION = 'Sales Region';

/**
 * Normalise a column value to a trimmed string, returning '' if absent.
 */
function str(row: Record<string, unknown>, col: string): string {
  const val = row[col];
  return typeof val === 'string' ? val.trim() : String(val ?? '').trim();
}

/**
 * mapUsers
 *
 * @param rows  Raw row objects from XLSX.utils.sheet_to_json
 * @returns     Array of Prisma UserCreateInput objects ready for upsert
 */
export function mapUsers(rows: Record<string, unknown>[]): UserCreateInput[] {
  const results: UserCreateInput[] = [];

  for (const row of rows) {
    const email = str(row, COL_EMAIL).toLowerCase();
    if (!email) {
      // Skip rows without a valid email
      continue;
    }

    const name   = str(row, COL_NAME)   || 'Unknown';
    const role   = str(row, COL_ROLE)   || 'AE';
    const region = str(row, COL_REGION) || 'NORAM';

    results.push({ name, email, role, salesRegion: region });
  }

  return results;
}
