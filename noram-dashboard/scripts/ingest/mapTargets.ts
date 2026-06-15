/**
 * mapTargets.ts
 *
 * Maps rows from the "Targets" Excel sheet to Prisma TargetCreateInput objects.
 *
 * Expected sheet columns:
 *   Period            — reporting period, e.g. "2025-06" or "Jun-25" or "Jun 2025"
 *   Type              — target type: see TargetType enum
 *   Amount / Target   — monetary target value (USD)
 *   Go-Live Count     — target number of new go-lives (optional, only for FRONTBOOK_BASE)
 *
 * Supported Type column values (case-insensitive):
 *   "Frontbook Base"  / "FB Base"  → FRONTBOOK_BASE
 *   "Frontbook Roll"  / "FB Roll"  → FRONTBOOK_ROLL
 *   "Backbook Managed"             → BACKBOOK_MANAGED
 *   "Backbook Unmanaged"           → BACKBOOK_UNMANAGED
 *   "TPV"                          → TPV
 */

export type TargetType =
  | 'FRONTBOOK_BASE'
  | 'FRONTBOOK_ROLL'
  | 'BACKBOOK_MANAGED'
  | 'BACKBOOK_UNMANAGED'
  | 'TPV';

export interface TargetCreateInput {
  period: string;      // "YYYY-MM"
  type: TargetType;
  amount: number;
  goLiveCount: number | null;
}

// ─── Type normalisation ────────────────────────────────────────────────────────

const TYPE_MAP: Record<string, TargetType> = {
  'frontbook base':    'FRONTBOOK_BASE',
  'fb base':           'FRONTBOOK_BASE',
  'frontbook_base':    'FRONTBOOK_BASE',
  'frontbook roll':    'FRONTBOOK_ROLL',
  'fb roll':           'FRONTBOOK_ROLL',
  'frontbook_roll':    'FRONTBOOK_ROLL',
  'backbook managed':  'BACKBOOK_MANAGED',
  'backbook_managed':  'BACKBOOK_MANAGED',
  'managed backbook':  'BACKBOOK_MANAGED',
  'backbook unmanaged':'BACKBOOK_UNMANAGED',
  'backbook_unmanaged':'BACKBOOK_UNMANAGED',
  'unmanaged backbook':'BACKBOOK_UNMANAGED',
  'tpv':               'TPV',
  'total payment volume': 'TPV',
};

function normaliseType(raw: string): TargetType | null {
  const mapped = TYPE_MAP[raw.toLowerCase().trim()];
  if (!mapped) {
    console.warn(`[mapTargets] Unknown target type "${raw}" — skipping row`);
    return null;
  }
  return mapped;
}

// ─── Period parsing ────────────────────────────────────────────────────────────

/**
 * Parses various period formats to "YYYY-MM" string.
 * Handles: "2025-06", "Jun-25", "Jun 2025", "01/06/2025", Excel serials.
 */
function parsePeriod(raw: unknown): string | null {
  if (!raw) return null;

  if (typeof raw === 'number') {
    // Excel serial date
    const date = new Date((raw - 25569) * 86400 * 1000);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  const str = String(raw).trim();

  // Already "YYYY-MM"
  if (/^\d{4}-\d{2}$/.test(str)) return str;

  // "YYYY-MM-DD" — take first 7 chars
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str.slice(0, 7);

  // "Mon-YY" e.g. "Jun-25"
  const shortMatch = str.match(/^([A-Za-z]{3})-(\d{2})$/);
  if (shortMatch) {
    const year = 2000 + parseInt(shortMatch[2]);
    const d    = new Date(`${shortMatch[1]} 1, ${year}`);
    if (!isNaN(d.getTime())) {
      return `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  // "Mon YYYY"
  const longMatch = str.match(/^([A-Za-z]{3})\s+(\d{4})$/);
  if (longMatch) {
    const d = new Date(`${longMatch[1]} 1, ${longMatch[2]}`);
    if (!isNaN(d.getTime())) {
      return `${longMatch[2]}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  console.warn(`[mapTargets] Could not parse period "${str}"`);
  return null;
}

function parseNum(raw: unknown): number {
  if (raw == null) return 0;
  const n = parseFloat(String(raw).replace(/[,$%\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseInt_(raw: unknown): number | null {
  if (raw == null) return null;
  const n = parseInt(String(raw), 10);
  return isNaN(n) ? null : n;
}

function get(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const val = row[key] ??
      Object.entries(row).find(([k]) => k.trim().toLowerCase() === key.toLowerCase())?.[1];
    if (val != null) return val;
  }
  return null;
}

// ─── Main mapper ──────────────────────────────────────────────────────────────

/**
 * mapTargets
 *
 * Maps raw rows to TargetCreateInput.
 * Rows with unrecognised type or unparseable period are skipped.
 */
export function mapTargets(rows: Record<string, unknown>[]): TargetCreateInput[] {
  const results: TargetCreateInput[] = [];

  for (const row of rows) {
    const periodRaw = get(row, 'Period', 'Month', 'Date');
    const period    = parsePeriod(periodRaw);
    if (!period) continue;

    const typeRaw = String(get(row, 'Type', 'Target Type', 'Category') ?? '').trim();
    const type    = normaliseType(typeRaw);
    if (!type) continue;

    const amount     = parseNum(get(row, 'Amount', 'Target', 'Target Amount', 'Value'));
    const goLiveCount = parseInt_(get(row, 'Go-Live Count', 'Go Live Count', 'Go Lives', 'Count'));

    results.push({ period, type, amount, goLiveCount });
  }

  return results;
}
