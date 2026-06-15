/**
 * mapUsers.ts
 *
 * Maps rows from the "NORAM Users - AW" Excel sheet to Prisma UserCreateInput objects.
 *
 * Expected sheet columns (case-insensitive matching applied):
 *   - Name          : Full name of the rep / AM
 *   - Email         : Work email address (used as unique key for upserts)
 *   - Role          : "AE", "SDR", "AM", "Manager", "VP"
 *   - Sales Region  : "NORAM East", "NORAM West", "NORAM Central", etc.
 *
 * Notes:
 *   - Rows with missing email are skipped (email is the unique identifier).
 *   - Role defaults to "AE" if not present.
 *   - Sales Region defaults to "NORAM" if not present.
 */

import type { Prisma } from '@prisma/client';

// Column name constants — update these if the sheet headers change
const COL_NAME = 'Name';
const COL_EMAIL = 'Email';
const COL_ROLE = 'Role';
const COL_REGION = 'Sales Region';

/**
 * normaliseRow
 * Returns a copy of the row with trimmed string values and lowercased keys
 * for case-insensitive column matching.
 */
function normaliseRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key.trim()] = typeof value === 'string' ? value.trim() : value;
  }
  return out;
}

/**
 * mapUsers
 *
 * @param rows  Raw row objects from XLSX.utils.sheet_to_json
 * @returns     Array of Prisma.UserCreateInput objects ready for prisma.user.createMany
 */
export function mapUsers(rows: Record<string, any>[]): Prisma.UserCreateInput[] {
  const results: Prisma.UserCreateInput[] = [];

  for (const raw of rows) {
    const row = normaliseRow(raw);
    const email = row[COL_EMAIL] as string | null;

    // Skip rows without a valid email — cannot upsert without unique key
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      console.warn('[mapUsers] Skipping row — missing or invalid email:', row);
      continue;
    }

    results.push({
      name: (row[COL_NAME] as string | null) ?? email.split('@')[0],
      email: email.toLowerCase(),
      role: (row[COL_ROLE] as string | null) ?? 'AE',
      salesRegion: (row[COL_REGION] as string | null) ?? 'NORAM',
    });
  }

  return results;
}
