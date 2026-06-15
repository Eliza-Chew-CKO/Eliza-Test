/**
 * mapFinancials.ts
 *
 * Maps rows from the "Data" and "BIN TPV - AW" sheets to
 * Prisma FinancialActualCreateInput objects.
 *
 * ── "DATA" sheet columns ──────────────────────────────────────────────────────
 *   Account Alias / Account  — account identifier
 *   Month / Reporting Month  — reporting period (YYYY-MM or Mon-YY)
 *   Total Fees               — gross fees charged
 *   Gross FX                 — gross FX revenue
 *   CCP Exclusion            — CCP exclusion amount (subtract from revenue)
 *   Net Revenue              — net revenue = Total Fees + Gross FX - CCP Exclusion
 *   TPV                      — total payment volume for this account+month
 *
 * ── "BIN TPV - AW" sheet columns ─────────────────────────────────────────────
 *   Account / Account Alias  — account identifier
 *   Month / Date             — reporting period
 *   BIN Type                 — BIN type (e.g. "Credit", "Debit", "Prepaid")
 *   Acquirer ID              — acquiring bank identifier
 *   TPV                      — TPV for this BIN+acquirer combination
 *   (fee/revenue columns may be absent or zero for BIN rows)
 */

export type SheetType = 'DATA' | 'BIN_TPV';

export interface FinancialActualCreateInput {
  accountId: string;
  reportingMonth: Date;
  totalFees: number;
  grossFX: number;
  ccpExclusion: number;
  netRevenue: number;
  tpvAmount: number;
  binType: string | null;
  acquirerId: string | null;
}

// ─── Month parsing ─────────────────────────────────────────────────────────────

/**
 * Parses various month string formats to a Date set to the first of the month.
 * Handles: "2025-06", "Jun-25", "Jun 2025", "01/06/2025", Excel serial numbers.
 */
function parseReportingMonth(raw: unknown): Date | null {
  if (!raw) return null;

  // Excel serial date (number)
  if (typeof raw === 'number') {
    // Excel date serial: days since 1900-01-01 (with leap year bug)
    const date = new Date((raw - 25569) * 86400 * 1000);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  const str = String(raw).trim();

  // "YYYY-MM" or "YYYY-MM-DD"
  const isoMatch = str.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, 1);
  }

  // "Mon-YY" e.g. "Jun-25"
  const shortMatch = str.match(/^([A-Za-z]{3})-(\d{2})$/);
  if (shortMatch) {
    const year = 2000 + parseInt(shortMatch[2]);
    const d = new Date(`${shortMatch[1]} 1, ${year}`);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), 1);
  }

  // "Mon YYYY" e.g. "Jun 2025"
  const longMatch = str.match(/^([A-Za-z]{3})\s+(\d{4})$/);
  if (longMatch) {
    const d = new Date(`${longMatch[1]} 1, ${longMatch[2]}`);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), 1);
  }

  // Fallback
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  return null;
}

// ─── Numeric helpers ───────────────────────────────────────────────────────────

function parseNum(raw: unknown): number {
  if (raw == null) return 0;
  const n = parseFloat(String(raw).replace(/[,$%\s]/g, ''));
  return isNaN(n) ? 0 : n;
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
 * mapFinancials
 *
 * Maps raw rows to FinancialActualCreateInput.
 * Handles both the "DATA" and "BIN_TPV" sheet formats.
 *
 * @param rows      Raw row objects from xlsx
 * @param sheetType 'DATA' for the main fee/revenue sheet, 'BIN_TPV' for BIN TPV breakdown
 */
export function mapFinancials(
  rows: Record<string, unknown>[],
  sheetType: SheetType
): FinancialActualCreateInput[] {
  const results: FinancialActualCreateInput[] = [];

  for (const row of rows) {
    const accountId = String(
      get(row, 'Account Alias', 'Account', 'Alias') ?? ''
    ).trim();
    if (!accountId) continue;

    const reportingMonth = parseReportingMonth(
      get(row, 'Month', 'Reporting Month', 'Date', 'Period')
    );
    if (!reportingMonth) {
      console.warn(`[mapFinancials] Skipping row with unparseable month:`, row);
      continue;
    }

    if (sheetType === 'DATA') {
      const totalFees    = parseNum(get(row, 'Total Fees',  'Fees'));
      const grossFX      = parseNum(get(row, 'Gross FX',   'FX Revenue'));
      const ccpExclusion = parseNum(get(row, 'CCP Exclusion', 'CCP'));
      // Use explicit Net Revenue column if present; otherwise calculate
      const netRevenueRaw = get(row, 'Net Revenue', 'Net Rev');
      const netRevenue    = netRevenueRaw != null
        ? parseNum(netRevenueRaw)
        : totalFees + grossFX - ccpExclusion;
      const tpvAmount = parseNum(get(row, 'TPV', 'Total Payment Volume'));

      results.push({
        accountId,
        reportingMonth,
        totalFees,
        grossFX,
        ccpExclusion,
        netRevenue,
        tpvAmount,
        binType:    null,
        acquirerId: null,
      });
    } else {
      // BIN_TPV sheet — minimal fee data, enriched BIN/acquirer detail
      const tpvAmount  = parseNum(get(row, 'TPV', 'Total Payment Volume', 'Amount'));
      const binType    = String(get(row, 'BIN Type', 'BIN', 'Card Type') ?? '').trim() || null;
      const acquirerId = String(get(row, 'Acquirer ID', 'Acquirer', 'ACQ ID') ?? '').trim() || null;

      results.push({
        accountId,
        reportingMonth,
        totalFees:    0,
        grossFX:      0,
        ccpExclusion: 0,
        netRevenue:   0,
        tpvAmount,
        binType,
        acquirerId,
      });
    }
  }

  return results;
}
