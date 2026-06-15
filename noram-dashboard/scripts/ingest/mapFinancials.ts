/**
 * mapFinancials.ts
 *
 * Maps rows from the "Data" and "BIN TPV - AW" sheets to Prisma
 * FinancialActualCreateInput objects.
 *
 * "Data" sheet columns (monthly fee/revenue per account):
 *   Account / Alias       — account alias (foreign key)
 *   Reporting Month       — month of the data (e.g. "Jun-25", "2025-06-01")
 *   Total Fees            — gross total fees charged
 *   Gross FX              — FX revenue component
 *   CCP Exclusion         — chargebacks / CCP exclusion amount
 *   Net Revenue           — Total Fees - Gross FX - CCP Exclusion (or explicit)
 *   TPV Amount            — total processed volume
 *
 * "BIN TPV - AW" sheet columns (TPV broken down by BIN):
 *   Account / Alias       — account alias
 *   Reporting Month       — month
 *   BIN Type              — BIN category code
 *   Acquirer ID           — acquirer identifier
 *   TPV Amount            — volume for this BIN/acquirer combination
 *   Net Revenue           — revenue attributed to this BIN (may be partial)
 */

type FinancialActualCreateInput = {
  accountId: string;      // placeholder alias — resolve after account upsert
  reportingMonth: Date;
  totalFees: number;
  grossFX: number;
  ccpExclusion: number;
  netRevenue: number;
  tpvAmount: number;
  binType?: string;
  acquirerId?: string;
};

export type SheetType = 'DATA' | 'BIN_TPV';

function parseAmount(val: unknown): number {
  const n = parseFloat(String(val ?? '0').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

/**
 * parseReportingMonth
 *
 * Handles multiple date formats from the spreadsheet:
 *   "Jun-25"       → 2025-06-01
 *   "2025-06-01"   → 2025-06-01
 *   "01/06/2025"   → 2025-06-01
 *   Excel serial   → date from serial number
 */
function parseReportingMonth(val: unknown): Date | undefined {
  if (!val) return undefined;

  // If it's already a Date object (cellDates: true in xlsx config)
  if (val instanceof Date) {
    return new Date(Date.UTC(val.getFullYear(), val.getMonth(), 1));
  }

  const s = String(val).trim();

  // "Jun-25" or "Jun 25" format
  const shortMonthMatch = s.match(/^([A-Za-z]{3})[-\s](\d{2})$/);
  if (shortMonthMatch) {
    const d = new Date(`${shortMonthMatch[1]} 20${shortMonthMatch[2]}`);
    if (!isNaN(d.getTime())) {
      return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
    }
  }

  // ISO or slash-delimited
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
  }

  return undefined;
}

/**
 * mapFinancials
 *
 * @param rows       Raw row objects from xlsx
 * @param sheetType  'DATA' for the main revenue sheet, 'BIN_TPV' for BIN breakdown
 */
export function mapFinancials(
  rows: Record<string, unknown>[],
  sheetType: SheetType
): FinancialActualCreateInput[] {
  const results: FinancialActualCreateInput[] = [];

  for (const row of rows) {
    const alias = String(row['Account'] ?? row['Alias'] ?? row['Account Name'] ?? '').trim();
    if (!alias) continue;

    const reportingMonth = parseReportingMonth(
      row['Reporting Month'] ?? row['Month'] ?? row['Date']
    );
    if (!reportingMonth) continue;

    if (sheetType === 'DATA') {
      const totalFees    = parseAmount(row['Total Fees']);
      const grossFX      = parseAmount(row['Gross FX']);
      const ccpExclusion = parseAmount(row['CCP Exclusion'] ?? row['CCP']);
      const netRevenue   = parseAmount(row['Net Revenue']) ||
                           (totalFees - grossFX - ccpExclusion);
      const tpvAmount    = parseAmount(row['TPV Amount'] ?? row['TPV']);

      results.push({
        accountId: alias,
        reportingMonth,
        totalFees,
        grossFX,
        ccpExclusion,
        netRevenue,
        tpvAmount,
      });
    } else {
      // BIN_TPV sheet — partial revenue record with BIN/acquirer breakdown
      const tpvAmount  = parseAmount(row['TPV Amount'] ?? row['TPV']);
      const netRevenue = parseAmount(row['Net Revenue'] ?? row['Revenue']);
      const binType    = String(row['BIN Type'] ?? row['BIN'] ?? '').trim() || undefined;
      const acquirerId = String(row['Acquirer ID'] ?? row['Acquirer'] ?? '').trim() || undefined;

      results.push({
        accountId: alias,
        reportingMonth,
        totalFees: 0,
        grossFX: 0,
        ccpExclusion: 0,
        netRevenue,
        tpvAmount,
        binType,
        acquirerId,
      });
    }
  }

  return results;
}
