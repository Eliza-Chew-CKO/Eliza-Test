/**
 * mapTargets.ts
 *
 * Maps rows from the "Targets" sheet to Prisma TargetCreateInput objects.
 *
 * Expected sheet columns:
 *   - "Period"         → target.period in "YYYY-MM" format
 *                        (also accepts "Jan 2025" / "January 2025" / Date objects)
 *   - "Type"           → target.type — one of:
 *                          "Frontbook Base" | "Frontbook Roll" | "Backbook Managed" |
 *                          "Backbook Unmanaged" | "TPV"
 *   - "Amount"         → target.amount (currency value)
 *   - "Go Live Count"  → target.goLiveCount (integer, only used for FRONTBOOK_BASE rows)
 *
 * Unique constraint: [period, type] — the upsert script should use this pair
 * as the where clause.
 */

import type { Prisma, TargetType } from '@prisma/client';
import type { SheetRow } from './parseExcel';
import { format } from 'date-fns';

// ─── Column constants ─────────────────────────────────────────────────────────
const COL_PERIOD    = 'Period';
const COL_TYPE      = 'Type';
const COL_AMOUNT    = 'Amount';
const COL_GOLIVE_CT = 'Go Live Count';

// ─── Type mapping ─────────────────────────────────────────────────────────────

const TYPE_MAP: Record<string, TargetType> = {
  'frontbook base':        'FRONTBOOK_BASE',
  'frontbook - base':      'FRONTBOOK_BASE',
  'base mnr':              'FRONTBOOK_BASE',
  'frontbook roll':        'FRONTBOOK_ROLL',
  'frontbook - roll':      'FRONTBOOK_ROLL',
  'roll mnr':              'FRONTBOOK_ROLL',
  'backbook managed':      'BACKBOOK_MANAGED',
  'backbook - managed':    'BACKBOOK_MANAGED',
  'managed':               'BACKBOOK_MANAGED',
  'backbook unmanaged':    'BACKBOOK_UNMANAGED',
  'backbook - unmanaged':  'BACKBOOK_UNMANAGED',
  'unmanaged':             'BACKBOOK_UNMANAGED',
  'tpv':                   'TPV',
  'total payment volume':  'TPV',
};

function normaliseTargetType(raw: string | null | undefined): TargetType | null {
  if (!raw) return null;
  return TYPE_MAP[raw.toString().toLowerCase().trim()] ?? null;
}

// ─── Period parsing ───────────────────────────────────────────────────────────

/**
 * Parses a period value into "YYYY-MM" format.
 * Accepts Date objects, ISO strings, "Jan 2025", or "2025-06" strings.
 */
function parsePeriod(raw: any): string | null {
  if (!raw) return null;

  if (raw instanceof Date) {
    return format(raw, 'yyyy-MM');
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();

    // Already in YYYY-MM format
    if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;

    // Try parsing as a generic date string
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return format(d, 'yyyy-MM');
    }
  }

  // Excel serial number
  if (typeof raw === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + raw * 86_400_000);
    return format(d, 'yyyy-MM');
  }

  return null;
}

function parseCurrency(raw: any): number {
  if (!raw) return 0;
  if (typeof raw === 'number') return raw;
  const cleaned = raw.toString().replace(/[$,\s]/g, '');
  return parseFloat(cleaned) || 0;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

/**
 * Maps raw target rows to Prisma TargetCreateInput objects.
 * Rows with unrecognised type or invalid period are skipped with a warning.
 */
export function mapTargets(rows: SheetRow[]): Prisma.TargetCreateInput[] {
  const mapped: Prisma.TargetCreateInput[] = [];

  for (const row of rows) {
    const period = parsePeriod(row[COL_PERIOD]);
    const type   = normaliseTargetType(row[COL_TYPE]);

    if (!period) {
      console.warn('[mapTargets] Skipping row with invalid period:', row);
      continue;
    }

    if (!type) {
      console.warn(`[mapTargets] Skipping row with unknown type "${row[COL_TYPE]}":`, row);
      continue;
    }

    const amount     = parseCurrency(row[COL_AMOUNT]);
    const goLiveCount = row[COL_GOLIVE_CT] != null
      ? parseInt(row[COL_GOLIVE_CT].toString(), 10) || null
      : null;

    mapped.push({
      period,
      type,
      amount,
      goLiveCount,
    });
  }

  return mapped;
}
