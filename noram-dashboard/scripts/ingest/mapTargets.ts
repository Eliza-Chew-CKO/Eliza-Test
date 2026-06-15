/**
 * mapTargets.ts
 *
 * Maps rows from the "Targets" sheet to Target records in the database.
 *
 * Expected sheet columns:
 *   Period      — reporting period as "YYYY-MM" (e.g. "2026-01")
 *   Type        — target type string, mapped to TargetType enum values:
 *                   "Frontbook Base"      → FRONTBOOK_BASE
 *                   "Frontbook Roll"      → FRONTBOOK_ROLL
 *                   "Backbook Managed"    → BACKBOOK_MANAGED
 *                   "Backbook Unmanaged"  → BACKBOOK_UNMANAGED
 *                   "TPV"                 → TPV
 *   Amount      — target monetary value (number or string with $ / commas)
 *   GoLiveCount — (optional) target number of go-lives (used with FRONTBOOK_BASE)
 *
 * The @@unique([period, type]) constraint means re-running this script is safe;
 * existing targets for a period will be updated with the latest values.
 */

// ─── Column name constants ─────────────────────────────────────────────────────
const COL_PERIOD = 'Period';
const COL_TYPE = 'Type';
const COL_AMOUNT = 'Amount';
const COL_GO_LIVE_COUNT = 'GoLiveCount';

// ─── Target type normalisation ─────────────────────────────────────────────────
type TargetTypeKey =
  | 'FRONTBOOK_BASE'
  | 'FRONTBOOK_ROLL'
  | 'BACKBOOK_MANAGED'
  | 'BACKBOOK_UNMANAGED'
  | 'TPV';

const TARGET_TYPE_MAP: Record<string, TargetTypeKey> = {
  'frontbook base':    'FRONTBOOK_BASE',
  'frontbook_base':    'FRONTBOOK_BASE',
  'base':              'FRONTBOOK_BASE',
  'frontbook roll':    'FRONTBOOK_ROLL',
  'frontbook_roll':    'FRONTBOOK_ROLL',
  'roll':              'FRONTBOOK_ROLL',
  'backbook managed':  'BACKBOOK_MANAGED',
  'backbook_managed':  'BACKBOOK_MANAGED',
  'managed':           'BACKBOOK_MANAGED',
  'backbook unmanaged':'BACKBOOK_UNMANAGED',
  'backbook_unmanaged':'BACKBOOK_UNMANAGED',
  'unmanaged':         'BACKBOOK_UNMANAGED',
  'tpv':               'TPV',
  'total payment volume': 'TPV',
};

function normaliseTargetType(raw: string): TargetTypeKey | null {
  const key = raw.trim().toLowerCase();
  return TARGET_TYPE_MAP[key] ?? null;
}

function parseCurrency(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const num = parseFloat(String(value).replace(/[$,\s]/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * Normalise a period value to "YYYY-MM" string.
 * Accepts: "2026-01", "Jan 2026", "January 2026", Excel serial date.
 */
function normalisePeriod(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).trim();

  // Already "YYYY-MM"
  if (/^\d{4}-\d{2}$/.test(str)) return str;

  // Try to parse as date and extract year/month
  const asNum = Number(str);
  let d: Date;
  if (!isNaN(asNum) && asNum > 40_000) {
    d = new Date((asNum - 25569) * 86400 * 1000);
  } else {
    d = new Date(str);
  }

  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  return null;
}

export interface TargetRow {
  [COL_PERIOD]: unknown;
  [COL_TYPE]: string;
  [COL_AMOUNT]: unknown;
  [COL_GO_LIVE_COUNT]?: unknown;
  [key: string]: unknown;
}

/**
 * mapTargets
 *
 * Upserts Target records from the "Targets" sheet.
 * Uses the Prisma client passed in to support use from the main parseExcel script.
 *
 * @param rows   — raw Excel rows
 * @param prisma — PrismaClient instance
 */
export async function mapTargets(rows: TargetRow[], prismaClient: any): Promise<void> {
  let upserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const period = normalisePeriod(row[COL_PERIOD]);
    if (!period) {
      console.warn(`[mapTargets] Could not parse period:`, row[COL_PERIOD]);
      skipped++;
      continue;
    }

    const type = normaliseTargetType(String(row[COL_TYPE] ?? ''));
    if (!type) {
      console.warn(`[mapTargets] Unrecognised target type: "${row[COL_TYPE]}"`);
      skipped++;
      continue;
    }

    const amount = parseCurrency(row[COL_AMOUNT]);
    const goLiveCount =
      row[COL_GO_LIVE_COUNT] !== null && row[COL_GO_LIVE_COUNT] !== undefined
        ? parseInt(String(row[COL_GO_LIVE_COUNT]), 10) || null
        : null;

    await prismaClient.target.upsert({
      where: { period_type: { period, type } },
      create: { period, type, amount, goLiveCount },
      update: { amount, goLiveCount },
    });

    upserted++;
  }

  console.log(`[mapTargets] Upserted ${upserted} targets, skipped ${skipped}.`);
}
