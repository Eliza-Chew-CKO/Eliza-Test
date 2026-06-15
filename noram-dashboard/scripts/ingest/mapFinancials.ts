/**
 * mapFinancials.ts
 *
 * Maps rows from both the "Data" sheet and the "BIN TPV - AW" sheet to
 * FinancialActual create objects.
 *
 * The two sheets have different structures:
 *
 * "Data" sheet (sheetType: 'DATA'):
 *   - "Account" or "Client"          → accountId (by alias)
 *   - "Month" or "Reporting Month"   → reportingMonth
 *   - "Total Fees"                   → totalFees
 *   - "Gross FX"                     → grossFX
 *   - "CCP Exclusion" or "CCP"       → ccpExclusion
 *   - "Net Revenue" or "Net Rev"     → netRevenue
 *   - "TPV" or "Total Volume"        → tpvAmount (may be 0 in this sheet)
 *
 * "BIN TPV - AW" sheet (sheetType: 'BIN_TPV'):
 *   - "Account" or "Merchant"        → accountId (by alias)
 *   - "Month" or "Period"            → reportingMonth
 *   - "BIN" or "BIN Type"            → binType
 *   - "Acquirer" or "Acquirer ID"    → acquirerId
 *   - "TPV" or "Volume"              → tpvAmount
 *   - Other fee columns may be 0 for TPV-only rows
 */

export type SheetType = 'DATA' | 'BIN_TPV';

export interface FinancialActualCreateInput {
  accountId:      string;   // Resolved from alias in production
  reportingMonth: Date;
  totalFees:      number;
  grossFX:        number;
  ccpExclusion:   number;
  netRevenue:     number;
  tpvAmount:      number;
  binType:        string | null;
  acquirerId:     string | null;
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
 * Parse a reporting month string to the first day of that month as a Date.
 * Handles formats: "Jan 2025", "2025-01", "01/2025", Excel serial dates.
 */
function parseReportingMonth(raw: unknown): Date | null {
  if (!raw) return null;

  if (typeof raw === 'number') {
    // Excel serial date
    const d = new Date((raw - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
  }

  const str = String(raw).trim();
  if (!str) return null;

  // Try standard ISO parse
  const direct = new Date(str);
  if (!isNaN(direct.getTime())) {
    return new Date(direct.getFullYear(), direct.getMonth(), 1);
  }

  // Try "Mon YYYY" format (e.g. "Jan 2025")
  const monthYear = /^([A-Za-z]{3})\s+(\d{4})$/.exec(str);
  if (monthYear) {
    const parsed = new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
    if (!isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    }
  }

  return null;
}

/**
 * mapFinancials
 *
 * Converts raw sheet rows into FinancialActualCreateInput objects.
 * Handles both the main Data sheet and the BIN TPV sheet.
 *
 * @param rows      - Raw row objects from xlsx.utils.sheet_to_json
 * @param sheetType - 'DATA' for the main fee/revenue sheet, 'BIN_TPV' for BIN TPV data
 * @returns Array of FinancialActualCreateInput objects
 */
export function mapFinancials(
  rows: Record<string, unknown>[],
  sheetType: SheetType,
): FinancialActualCreateInput[] {
  const mapped: FinancialActualCreateInput[] = [];

  for (const row of rows) {
    const accountAlias = resolveColumn(row, ['Account', 'Client', 'Merchant', 'Account Name']);
    if (!accountAlias) continue;

    const monthRaw      = row['Month'] ?? row['Reporting Month'] ?? row['Period'] ?? null;
    const reportingMonth = parseReportingMonth(monthRaw);
    if (!reportingMonth) continue;

    if (sheetType === 'DATA') {
      mapped.push({
        accountId:      accountAlias,
        reportingMonth,
        totalFees:      parseMoney(row['Total Fees'] ?? row['Fees']),
        grossFX:        parseMoney(row['Gross FX']   ?? row['FX Revenue']),
        ccpExclusion:   parseMoney(row['CCP Exclusion'] ?? row['CCP'] ?? row['CCP Excl']),
        netRevenue:     parseMoney(row['Net Revenue'] ?? row['Net Rev'] ?? row['NR']),
        tpvAmount:      parseMoney(row['TPV'] ?? row['Total Volume'] ?? row['Volume']),
        binType:        null,
        acquirerId:     resolveColumn(row, ['Acquirer', 'Acquirer ID']) || null,
      });
    } else {
      // BIN_TPV sheet — primarily TPV data broken down by BIN type and acquirer
      mapped.push({
        accountId:      accountAlias,
        reportingMonth,
        totalFees:      0,
        grossFX:        0,
        ccpExclusion:   0,
        netRevenue:     0,
        tpvAmount:      parseMoney(row['TPV'] ?? row['Volume'] ?? row['Total Volume']),
        binType:        resolveColumn(row, ['BIN', 'BIN Type', 'Card Type']) || null,
        acquirerId:     resolveColumn(row, ['Acquirer', 'Acquirer ID', 'ACQ']) || null,
      });
    }
  }

  return mapped;
}
