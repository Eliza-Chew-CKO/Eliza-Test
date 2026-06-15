/**
 * mapTargets.ts
 *
 * Maps rows from the "Targets" Excel sheet to Prisma TargetCreateInput objects.
 *
 * Expected sheet columns:
 *   - Period           : Month in "YYYY-MM" format, or Excel date (normalised to first of month)
 *   - Type             : Target type label — mapped to TargetType enum
 *   - Amount           : Numeric target value (revenue or TPV)
 *   - Go Live Count    : Integer target for number of go-lives (only for FRONTBOOK_BASE type)
 *
 * Type column values (case-insensitive matching):
 *   "frontbook base"   → FRONTBOOK_BASE
 *   "frontbook roll"   → FRONTBOOK_ROLL
 *   "backbook managed" → BACKBOOK_MANAGED
 *   "backbook unmanaged" → BACKBOOK_UNMANAGED
 *   "tpv"              → TPV
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
const COL_PERIOD = 'Period';
const COL_TYPE = 'Type';
const COL_AMOUNT = 'Amount';
const COL_GO_LIVE_COUNT = 'Go Live Count';

type TargetType =
  | 'FRONTBOOK_BASE'
  | 'FRONTBOOK_ROLL'
  | 'BACKBOOK_MANAGED'
  | 'BACKBOOK_UNMANAGED'
  | 'TPV';

const TYPE_MAP: Record<string, TargetType> = {
  'frontbook base': 'FRONTBOOK_BASE',
  'frontbook_base': 'FRONTBOOK_BASE',
  'frontbook roll': 'FRONTBOOK_ROLL',
  'frontbook_roll': 'FRONTBOOK_ROLL',
  'backbook managed': 'BACKBOOK_MANAGED',
  'backbook_managed': 'BACKBOOK_MANAGED',
  'backbook unmanaged': 'BACKBOOK_UNMANAGED',
  'backbook_unmanaged': 'BACKBOOK_UNMANAGED',
  'tpv': 'TPV',
  'total processing volume': 'TPV',
};

/**
 * normaliseTargetType
 * Maps a raw type string from the sheet to a TargetType enum value.
 */
function normaliseTargetType(raw: string | null | undefined): TargetType | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return TYPE_MAP[key] ?? null;
}

/**
 * parsePeriod
 * Returns a "YYYY-MM" string from an Excel date serial, ISO string, or existing "YYYY-MM" value.
 */
function parsePeriod(value: any): string | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value.trim())) {
    return value.trim(); // Already in YYYY-MM format
  }
  const date = parseExcelDate(value);
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * mapTargets
 *
 * @param rows  Raw row objects from the "Targets" sheet
 * @returns     Array of Prisma.TargetCreateInput objects
 */
export function mapTargets(rows: Record<string, any>[]): Prisma.TargetCreateInput[] {
  const results: Prisma.TargetCreateInput[] = [];

  for (const row of rows) {
    const period = parsePeriod(row[COL_PERIOD]);
    const type = normaliseTargetType(row[COL_TYPE] as string | null);

    if (!period || !type) {
      console.warn('[mapTargets] Skipping row — missing or invalid period/type:', row);
      continue;
    }

    const amount = typeof row[COL_AMOUNT] === 'number' ? row[COL_AMOUNT] : 0;
    const goLiveCountRaw = row[COL_GO_LIVE_COUNT];
    const goLiveCount =
      typeof goLiveCountRaw === 'number' && !isNaN(goLiveCountRaw)
        ? Math.round(goLiveCountRaw)
        : null;

    results.push({
      period,
      type,
      amount,
      goLiveCount,
    });
  }

  return results;
}
