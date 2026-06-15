/**
 * mapFinancials.ts
 *
 * Maps rows from the "Data" and "BIN TPV - AW" Excel sheets to
 * Prisma FinancialActualCreateInput objects.
 *
 * "Data" sheet expected columns:
 *   - Account Alias / Account Name : Links to Account.alias
 *   - Reporting Month              : Month of the financials (Excel date or "YYYY-MM")
 *   - Total Fees                   : Gross fee revenue
 *   - Gross FX                     : Gross FX revenue
 *   - CCP Exclusion                : CCP (Commercial Card Programme) exclusions
 *   - Net Revenue                  : totalFees + grossFX - ccpExclusion
 *   - TPV Amount                   : Total Processing Volume
 *
 * "BIN TPV - AW" sheet expected columns:
 *   - Account Alias / Account Name
 *   - Reporting Month
 *   - TPV Amount                   : BIN-level TPV
 *   - BIN Type                     : "Debit" | "Credit" | "Commercial" | "Prepaid"
 *   - Acquirer ID                  : Acquirer identifier
 *
 * When sheetType === 'BIN_TPV', fee/revenue fields default to 0 since
 * that sheet only carries TPV broken down by BIN.
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

export type SheetType = 'DATA' | 'BIN_TPV';

// "Data" sheet column names
const DATA_COLS = {
  alias: 'Account Alias',
  month: 'Reporting Month',
  totalFees: 'Total Fees',
  grossFX: 'Gross FX',
  ccpExclusion: 'CCP Exclusion',
  netRevenue: 'Net Revenue',
  tpv: 'TPV Amount',
};

// "BIN TPV - AW" sheet column names
const BIN_TPV_COLS = {
  alias: 'Account Alias',
  month: 'Reporting Month',
  tpv: 'TPV Amount',
  binType: 'BIN Type',
  acquirerId: 'Acquirer ID',
};

function parseDecimal(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value.replace(/[$,£€\s]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/**
 * mapFinancials
 *
 * @param rows       Raw row objects from the relevant sheet
 * @param sheetType  'DATA' or 'BIN_TPV' — determines which column mapping to use
 * @returns          Array of Prisma.FinancialActualCreateInput objects
 */
export function mapFinancials(
  rows: Record<string, any>[],
  sheetType: SheetType
): Prisma.FinancialActualCreateInput[] {
  const results: Prisma.FinancialActualCreateInput[] = [];

  for (const row of rows) {
    const cols = sheetType === 'DATA' ? DATA_COLS : BIN_TPV_COLS;
    const alias = (row[cols.alias] as string | null)?.trim();
    const monthRaw = row[cols.month];

    if (!alias || !monthRaw) {
      continue; // Skip header/summary rows without account and month
    }

    const reportingMonth = parseExcelDate(monthRaw);
    if (!reportingMonth) {
      console.warn(`[mapFinancials] Could not parse month "${monthRaw}" for account "${alias}"`);
      continue;
    }

    // Normalise to first day of month
    reportingMonth.setDate(1);
    reportingMonth.setHours(0, 0, 0, 0);

    if (sheetType === 'DATA') {
      const totalFees = parseDecimal(row[DATA_COLS.totalFees]);
      const grossFX = parseDecimal(row[DATA_COLS.grossFX]);
      const ccpExclusion = parseDecimal(row[DATA_COLS.ccpExclusion]);
      const netRevenue =
        parseDecimal(row[DATA_COLS.netRevenue]) || totalFees + grossFX - ccpExclusion;

      results.push({
        account: { connect: { alias } },
        reportingMonth,
        totalFees,
        grossFX,
        ccpExclusion,
        netRevenue,
        tpvAmount: parseDecimal(row[DATA_COLS.tpv]),
        binType: null,
        acquirerId: null,
      });
    } else {
      // BIN_TPV sheet — only TPV figures with BIN/acquirer breakdown
      results.push({
        account: { connect: { alias } },
        reportingMonth,
        totalFees: 0,
        grossFX: 0,
        ccpExclusion: 0,
        netRevenue: 0,
        tpvAmount: parseDecimal(row[BIN_TPV_COLS.tpv]),
        binType: (row[BIN_TPV_COLS.binType] as string | null)?.trim() ?? null,
        acquirerId: (row[BIN_TPV_COLS.acquirerId] as string | null)?.trim() ?? null,
      });
    }
  }

  return results;
}
