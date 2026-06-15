/**
 * mapTargets.ts
 *
 * Maps rows from the "Targets" sheet to Prisma TargetCreateInput objects.
 *
 * Expected sheet columns:
 *   Period          — "YYYY-MM" or "Mon-YY" (e.g. "Jun-25") — the target month
 *   Type            — target type string (mapped to TargetType enum below)
 *   Amount          — target revenue amount (USD)
 *   Go-Live Count   — optional count of expected go-lives (FRONTBOOK_BASE only)
 *
 * Type mapping:
 *   "Frontbook Base" / "FB Base"     → FRONTBOOK_BASE
 *   "Frontbook Roll" / "FB Roll"     → FRONTBOOK_ROLL
 *   "Backbook Managed"               → BACKBOOK_MANAGED
 *   "Backbook Unmanaged"             → BACKBOOK_UNMANAGED
 *   "TPV"                            → TPV
 */

type TargetType =
  | 'FRONTBOOK_BASE'
  | 'FRONTBOOK_ROLL'
  | 'BACKBOOK_MANAGED'
  | 'BACKBOOK_UNMANAGED'
  | 'TPV';

type TargetCreateInput = {
  period: string;
  type: TargetType;
  amount: number;
  goLiveCount?: number;
};

// ─── Type label → enum mapping ────────────────────────────────────────────────
const TYPE_MAP: Record<string, TargetType> = {
  'frontbook base':    'FRONTBOOK_BASE',
  'fb base':           'FRONTBOOK_BASE',
  'frontbook roll':    'FRONTBOOK_ROLL',
  'fb roll':           'FRONTBOOK_ROLL',
  'backbook managed':  'BACKBOOK_MANAGED',
  'managed':           'BACKBOOK_MANAGED',
  'backbook unmanaged':'BACKBOOK_UNMANAGED',
  'unmanaged':         'BACKBOOK_UNMANAGED',
  'tpv':               'TPV',
};

function normaliseType(raw: string): TargetType | null {
  return TYPE_MAP[raw.toLowerCase().trim()] ?? null;
}

/**
 * parsePeriod
 *
 * Converts various month representations to "YYYY-MM":
 *   "Jun-25"    → "2025-06"
 *   "2025-06"   → "2025-06"
 *   "2025-06-01"→ "2025-06"
 */
function parsePeriod(val: unknown): string | null {
  const s = String(val ?? '').trim();
  if (!s) return null;

  // Already "YYYY-MM"
  if (/^\d{4}-\d{2}$/.test(s)) return s;

  // "YYYY-MM-DD"
  const isoMatch = s.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

  // "Mon-YY" e.g. "Jun-25"
  const shortMatch = s.match(/^([A-Za-z]{3})[-\s](\d{2})$/);
  if (shortMatch) {
    const d = new Date(`${shortMatch[1]} 20${shortMatch[2]}`);
    if (!isNaN(d.getTime())) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${d.getFullYear()}-${mm}`;
    }
  }

  return null;
}

function parseAmount(val: unknown): number {
  const n = parseFloat(String(val ?? '0').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseGoLiveCount(val: unknown): number | undefined {
  if (!val) return undefined;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? undefined : n;
}

/**
 * mapTargets
 */
export function mapTargets(rows: Record<string, unknown>[]): TargetCreateInput[] {
  const results: TargetCreateInput[] = [];

  for (const row of rows) {
    const period = parsePeriod(row['Period'] ?? row['Month'] ?? row['Date']);
    if (!period) continue;

    const type = normaliseType(String(row['Type'] ?? row['Target Type'] ?? ''));
    if (!type) {
      console.warn(`[mapTargets] Unknown target type: "${row['Type']}" — skipping row`);
      continue;
    }

    const amount = parseAmount(row['Amount'] ?? row['Target']);
    const goLiveCount = parseGoLiveCount(row['Go-Live Count'] ?? row['Go Live Count']);

    results.push({ period, type, amount, goLiveCount });
  }

  return results;
}
