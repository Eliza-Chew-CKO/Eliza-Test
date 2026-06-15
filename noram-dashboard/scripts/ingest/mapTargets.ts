/**
 * mapTargets.ts
 *
 * Maps rows from the "Targets" Excel sheet to Target create objects.
 *
 * Expected sheet columns:
 *   - "Period" or "Month"           → period (normalised to "YYYY-MM" string)
 *   - "Type" or "Target Type"       → type (mapped to TargetType enum)
 *   - "Amount" or "Target Amount"   → amount
 *   - "Go Live Count" or "Go Lives" → goLiveCount (optional, integer)
 *
 * Target type mapping from sheet values to enum:
 *   "Frontbook Base"     → FRONTBOOK_BASE
 *   "Frontbook Roll"     → FRONTBOOK_ROLL
 *   "Backbook Managed"   → BACKBOOK_MANAGED
 *   "Backbook Unmanaged" → BACKBOOK_UNMANAGED
 *   "TPV"                → TPV
 */

export type TargetType =
  | 'FRONTBOOK_BASE'
  | 'FRONTBOOK_ROLL'
  | 'BACKBOOK_MANAGED'
  | 'BACKBOOK_UNMANAGED'
  | 'TPV';

export interface TargetCreateInput {
  period:      string;       // "YYYY-MM"
  type:        TargetType;
  amount:      number;
  goLiveCount: number | null;
}

function resolveColumn(row: Record<string, unknown>, candidates: string[]): string {
  for (const col of candidates) {
    const val = row[col];
    if (val !== null && val !== undefined && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

function parseMoney(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  const str = String(raw ?? '').replace(/[$,\s]/g, '');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

/**
 * Normalise period input to "YYYY-MM" format.
 * Handles: "Jan 2025", "2025-01", "01/2025", Excel serial dates.
 */
function normalisePeriod(raw: unknown): string | null {
  if (!raw) return null;

  if (typeof raw === 'number') {
    // Excel serial date
    const d = new Date((raw - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  const str = String(raw).trim();

  // Already YYYY-MM
  if (/^\d{4}-\d{2}$/.test(str)) return str;

  // "Mon YYYY" → "YYYY-MM"
  const monthYear = /^([A-Za-z]{3})\s+(\d{4})$/.exec(str);
  if (monthYear) {
    const d = new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  // "MM/YYYY"
  const slashFmt = /^(\d{1,2})\/(\d{4})$/.exec(str);
  if (slashFmt) {
    return `${slashFmt[2]}-${String(parseInt(slashFmt[1], 10)).padStart(2, '0')}`;
  }

  // Try standard date parse
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  return null;
}

/**
 * Map a raw type string to the TargetType enum value.
 * Case-insensitive matching on key terms.
 */
function mapTargetType(raw: string): TargetType | null {
  const lower = raw.toLowerCase();

  if (lower.includes('frontbook') && lower.includes('base'))        return 'FRONTBOOK_BASE';
  if (lower.includes('frontbook') && lower.includes('roll'))        return 'FRONTBOOK_ROLL';
  if (lower.includes('frontbook'))                                  return 'FRONTBOOK_BASE'; // default
  if (lower.includes('backbook') && lower.includes('unmanaged'))    return 'BACKBOOK_UNMANAGED';
  if (lower.includes('backbook') && lower.includes('managed'))      return 'BACKBOOK_MANAGED';
  if (lower.includes('backbook'))                                   return 'BACKBOOK_MANAGED'; // default
  if (lower.includes('tpv') || lower.includes('volume'))            return 'TPV';

  return null;
}

/**
 * mapTargets
 *
 * Converts raw Targets sheet rows into TargetCreateInput objects.
 * Rows with missing period or unrecognised type are skipped.
 *
 * @param rows - Raw row objects from xlsx.utils.sheet_to_json
 * @returns Array of TargetCreateInput objects
 */
export function mapTargets(rows: Record<string, unknown>[]): TargetCreateInput[] {
  const mapped: TargetCreateInput[] = [];

  for (const row of rows) {
    const periodRaw = row['Period'] ?? row['Month'] ?? row['Reporting Period'] ?? null;
    const period    = normalisePeriod(periodRaw);
    if (!period) continue;

    const typeRaw    = resolveColumn(row, ['Type', 'Target Type', 'Category']);
    const targetType = mapTargetType(typeRaw);
    if (!targetType) continue;

    const amountRaw     = row['Amount'] ?? row['Target Amount'] ?? row['Target'];
    const goLiveRaw     = row['Go Live Count'] ?? row['Go Lives'] ?? row['# Go Lives'] ?? null;
    const goLiveCount   = goLiveRaw !== null ? parseInt(String(goLiveRaw), 10) : null;

    mapped.push({
      period,
      type:        targetType,
      amount:      parseMoney(amountRaw),
      goLiveCount: goLiveCount !== null && !isNaN(goLiveCount) ? goLiveCount : null,
    });
  }

  return mapped;
}
