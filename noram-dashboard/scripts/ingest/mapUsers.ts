/**
 * mapUsers.ts
 *
 * Maps rows from the "NORAM Users - AW" Excel sheet to Prisma UserCreateInput objects.
 *
 * Expected sheet columns (header row 1):
 *   Name           — full name of the sales rep or account manager
 *   Email          — work email (used as unique identifier for upserts)
 *   Role           — role title: "AE" | "AM" | "Sales Manager" | "VP Sales"
 *   Sales Region   — geographic territory: "NORAM East" | "NORAM West" | "NORAM Central" | "Canada"
 *
 * Column names are normalised (trimmed, lowercased) before matching.
 */

// Prisma type stubs — replace with `import { Prisma } from '@noram/db'` when db package is built
export interface UserCreateInput {
  name: string;
  email: string;
  role: string;
  salesRegion: string;
}

// ─── Column name constants ─────────────────────────────────────────────────────

const COL_NAME   = 'name';
const COL_EMAIL  = 'email';
const COL_ROLE   = 'role';
const COL_REGION = 'sales region';

// ─── Normalise helpers ────────────────────────────────────────────────────────

function normaliseKey(key: string): string {
  return key.trim().toLowerCase();
}

function getString(row: Record<string, unknown>, col: string): string {
  // Try exact match first, then normalised match
  const raw = row[col] ?? Object.entries(row).find(([k]) => normaliseKey(k) === col)?.[1];
  return raw != null ? String(raw).trim() : '';
}

// ─── Role normalisation ────────────────────────────────────────────────────────

const ROLE_MAP: Record<string, string> = {
  'account executive': 'AE',
  'ae':                'AE',
  'account manager':   'AM',
  'am':                'AM',
  'sales manager':     'Sales Manager',
  'vp sales':          'VP Sales',
  'vp of sales':       'VP Sales',
};

function normaliseRole(raw: string): string {
  return ROLE_MAP[raw.toLowerCase()] ?? raw;
}

// ─── Main mapper ──────────────────────────────────────────────────────────────

/**
 * Maps raw Excel row objects to UserCreateInput records.
 * Rows with missing name or email are skipped with a console warning.
 */
export function mapUsers(rows: Record<string, unknown>[]): UserCreateInput[] {
  const results: UserCreateInput[] = [];

  for (const row of rows) {
    const name   = getString(row, COL_NAME);
    const email  = getString(row, COL_EMAIL);
    const role   = normaliseRole(getString(row, COL_ROLE));
    const region = getString(row, COL_REGION);

    if (!name || !email) {
      console.warn('[mapUsers] Skipping row with missing name or email:', row);
      continue;
    }

    if (!email.includes('@')) {
      console.warn(`[mapUsers] Skipping row with invalid email "${email}"`);
      continue;
    }

    results.push({ name, email, role, salesRegion: region });
  }

  return results;
}
