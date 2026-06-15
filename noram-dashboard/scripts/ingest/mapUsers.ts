/**
 * mapUsers.ts
 *
 * Maps rows from the "NORAM Users - AW" Excel sheet to Prisma UserCreateInput objects.
 *
 * Expected sheet columns (case-insensitive match attempted):
 *   - "Name"         → user.name
 *   - "Email"        → user.email  (used as unique key for upsert)
 *   - "Role"         → user.role   (e.g. "AE", "AM", "Manager")
 *   - "Region"       → user.salesRegion
 *
 * Notes:
 * - Rows with missing email or name are skipped with a warning.
 * - Email is lowercased and trimmed for deduplication.
 * - Role values are normalised: "Account Executive" → "AE", "Account Manager" → "AM".
 */

import type { Prisma } from '@prisma/client';
import type { SheetRow } from './parseExcel';

// ─── Expected column name constants ──────────────────────────────────────────
// Adjust these if the source Excel uses different column headers.
const COL_NAME   = 'Name';
const COL_EMAIL  = 'Email';
const COL_ROLE   = 'Role';
const COL_REGION = 'Region';

// ─── Role normalisation map ───────────────────────────────────────────────────
const ROLE_MAP: Record<string, string> = {
  'account executive':   'AE',
  'ae':                  'AE',
  'account manager':     'AM',
  'am':                  'AM',
  'manager':             'Manager',
  'sales manager':       'Manager',
  'admin':               'Admin',
  'administrator':       'Admin',
};

function normaliseRole(raw: string | null | undefined): string {
  if (!raw) return 'AE';
  const lower = raw.toString().toLowerCase().trim();
  return ROLE_MAP[lower] ?? raw.toString().trim();
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

/**
 * Maps raw sheet rows to Prisma UserCreateInput objects.
 *
 * @param rows - Array of plain objects from XLSX.utils.sheet_to_json
 * @returns Array of UserCreateInput ready for prisma.user.upsert()
 */
export function mapUsers(rows: SheetRow[]): Prisma.UserCreateInput[] {
  const mapped: Prisma.UserCreateInput[] = [];

  for (const row of rows) {
    const name  = row[COL_NAME]?.toString().trim();
    const email = row[COL_EMAIL]?.toString().trim().toLowerCase();
    const role  = normaliseRole(row[COL_ROLE]);
    const region = row[COL_REGION]?.toString().trim() ?? 'NORAM';

    if (!name || !email) {
      console.warn('[mapUsers] Skipping row with missing name or email:', row);
      continue;
    }

    // Basic email format guard
    if (!email.includes('@')) {
      console.warn(`[mapUsers] Skipping row — invalid email: "${email}"`);
      continue;
    }

    mapped.push({
      name,
      email,
      role,
      salesRegion: region,
    });
  }

  return mapped;
}
