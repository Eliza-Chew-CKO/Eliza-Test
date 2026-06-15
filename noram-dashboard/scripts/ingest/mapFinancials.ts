/**
 * mapFinancials.ts
 *
 * Maps rows from the "Data" and "BIN TPV - AW" sheets to Prisma
 * FinancialActualCreateInput objects.
 *
 * ── "Data" sheet columns ──────────────────────────────────────────────────────
 *   - "Account"          → accountId (alias, resolved to DB id at upsert time)
 *   - "Month"            → reportingMonth (first day of month)
 *   - "Total Fees"       → totalFees
 *   - "Gross FX"         → grossFX
 *   - "CCP Exclusion"    → ccpExclusion
 *   - "Net Revenue"      → netRevenue
 *   - "TPV"              → tpvAmount
 *   - (no BIN/acquirer columns in this sheet)
 *
 * ── "BIN TPV - AW" sheet columns ─────────────────────────────────────────────
 *   - "Account"          → accountId
 *   - "Month"            → reportingMonth
 *   - "BIN Type"         → binType (e.g. "DEBIT" | "CREDIT" | "PREPAID")
 *   - "Acquirer ID"      → acquirerId
 *   - "TPV"              → tpvAmount
 *   - Other fee/revenue columns may be 0 or absent in this sheet
 */

import type { Prisma } from '@prisma/client';
import type { SheetRow } from './parseExcel';

export type SheetType = 'DATA' | 'BIN_TPV';

// ─── Column maps ──────────────────────────────────────────────────────────────

const DATA_COLS = {
  account:      'Account',
  month:        'Month',
  totalFees:    'Total Fees',
  grossFX:      'Gross FX',
  ccpExclusion: 'CCP Exclusion',
  netRevenue:   'Net Revenue',
  tpv:          'TPV',
} as const;

const BIN_COLS = {
  account:   'Account',
  month:     'Month',
  binType:   'BIN Type',
  acquirerId:'Acquirer ID',
  tpv:       'TPV',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCurrency(raw: any): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') return raw;
  const cleaned = raw.toString().replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parses a month value from the sheet into a normalised first-of-month Date.
 * Accepts:
 *   - JS Date objects (from xlsx with cellDates: true)
 *   - "YYYY-MM-DD" strings
 *   - "Jan 2025", "January 2025" human-readable strings
 *   - Excel numeric serial dates
 */
function parseReportingMonth(raw: any): Date | null {
  if (!raw) return null;

  if (raw instanceof Date) {
    return new Date(Date.UTC(raw.getFullYear(), raw.getMonth(), 1));
  }

  if (typeof raw === 'string') {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
    }
  }

  // Excel serial number fallback
  if (typeof raw === 'number') {
    // Excel epoch is 1 Jan 1900 (with Lotus 1-2-3 leap year bug)
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + raw * 86_400_000);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
  }

  return null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

/**
 * Maps rows from either the "Data" or "BIN TPV - AW" sheet to
 * FinancialActualCreateInput objects.
 */
export function mapFinancials(
  rows: SheetRow[],
  sheetType: SheetType,
): Prisma.FinancialActualUncheckedCreateInput[] {
  const mapped: Prisma.FinancialActualUncheckedCreateInput[] = [];

  for (const row of rows) {
    const alias = row[DATA_COLS.account]?.toString().trim();
    if (!alias) continue;

    const reportingMonth = parseReportingMonth(
      sheetType === 'DATA' ? row[DATA_COLS.month] : row[BIN_COLS.month],
    );

    if (!reportingMonth) {
      console.warn(`[mapFinancials] Skipping row with invalid month for account "${alias}":`, row);
      continue;
    }

    if (sheetType === 'DATA') {
      mapped.push({
        accountId:      alias, // resolved to Account.id at upsert time
        reportingMonth,
        totalFees:      parseCurrency(row[DATA_COLS.totalFees]),
        grossFX:        parseCurrency(row[DATA_COLS.grossFX]),
        ccpExclusion:   parseCurrency(row[DATA_COLS.ccpExclusion]),
        netRevenue:     parseCurrency(row[DATA_COLS.netRevenue]),
        tpvAmount:      parseCurrency(row[DATA_COLS.tpv]),
        binType:        null,
        acquirerId:     null,
      });
    } else {
      // BIN_TPV sheet — only has TPV, BIN type, and acquirer info
      const binType    = row[BIN_COLS.binType]?.toString().trim() || null;
      const acquirerId = row[BIN_COLS.acquirerId]?.toString().trim() || null;

      mapped.push({
        accountId:      alias,
        reportingMonth,
        totalFees:      0,
        grossFX:        0,
        ccpExclusion:   0,
        netRevenue:     0,
        tpvAmount:      parseCurrency(row[BIN_COLS.tpv]),
        binType,
        acquirerId,
      });
    }
  }

  return mapped;
}
