/**
 * mapVAMP.ts
 *
 * Maps rows from the "Excessive VAMP" Excel sheet to Prisma VampRecordCreateInput objects.
 *
 * VAMP = Visa Acquirer Monitoring Programme
 *
 * Expected sheet columns:
 *   - Account Alias       : Links to Account.alias
 *   - Reporting Month     : Month of the VAMP assessment
 *   - Created Events      : Total created transaction events
 *   - Fraud Events        : Transactions flagged as fraudulent
 *   - Total Captured Events : Total successfully captured events
 *   - VAMP Ratio          : Pre-calculated ratio (or computed if missing)
 *   - VAMP Type           : "Standard" | "CNP" (Card Not Present)
 *   - VAMP Assessment     : "Acceptable" | "Elevated" | "Excessive"
 *   - Acquirer Country    : ISO 2-letter country code of the acquirer
 *   - Acquirer ID         : Unique acquirer identifier
 *
 * VAMP Ratio calculation (if column is absent or zero):
 *   vampRatio = fraudEvents / totalCapturedEvents
 *
 * Assessment classification (if column is absent):
 *   < 0.005  → "Acceptable"
 *   0.005–0.009 → "Elevated"
 *   >= 0.010 → "Excessive"
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

// Column constants
const COL_ALIAS = 'Account Alias';
const COL_MONTH = 'Reporting Month';
const COL_CREATED = 'Created Events';
const COL_FRAUD = 'Fraud Events';
const COL_CAPTURED = 'Total Captured Events';
const COL_RATIO = 'VAMP Ratio';
const COL_TYPE = 'VAMP Type';
const COL_ASSESSMENT = 'VAMP Assessment';
const COL_COUNTRY = 'Acquirer Country';
const COL_ACQUIRER = 'Acquirer ID';

/**
 * classifyAssessment
 * Assigns a VAMP assessment label based on the ratio thresholds.
 */
function classifyAssessment(ratio: number): string {
  if (ratio >= 0.01) return 'Excessive';
  if (ratio >= 0.005) return 'Elevated';
  return 'Acceptable';
}

/**
 * mapVAMP
 *
 * @param rows  Raw row objects from the "Excessive VAMP" sheet
 * @returns     Array of Prisma.VampRecordCreateInput objects
 */
export function mapVAMP(rows: Record<string, any>[]): Prisma.VampRecordCreateInput[] {
  const results: Prisma.VampRecordCreateInput[] = [];

  for (const row of rows) {
    const alias = (row[COL_ALIAS] as string | null)?.trim();
    const monthRaw = row[COL_MONTH];

    if (!alias || !monthRaw) {
      continue;
    }

    const reportingMonth = parseExcelDate(monthRaw);
    if (!reportingMonth) {
      console.warn(`[mapVAMP] Could not parse month "${monthRaw}" for account "${alias}"`);
      continue;
    }
    reportingMonth.setDate(1);
    reportingMonth.setHours(0, 0, 0, 0);

    const createdEvents = typeof row[COL_CREATED] === 'number' ? Math.round(row[COL_CREATED]) : 0;
    const fraudEvents = typeof row[COL_FRAUD] === 'number' ? Math.round(row[COL_FRAUD]) : 0;
    const totalCapturedEvents = typeof row[COL_CAPTURED] === 'number' ? Math.round(row[COL_CAPTURED]) : createdEvents;

    // Compute VAMP ratio if not provided
    let vampRatio = typeof row[COL_RATIO] === 'number' ? row[COL_RATIO] : 0;
    if (vampRatio === 0 && totalCapturedEvents > 0) {
      vampRatio = fraudEvents / totalCapturedEvents;
    }

    const vampAssessment =
      (row[COL_ASSESSMENT] as string | null)?.trim() || classifyAssessment(vampRatio);

    results.push({
      account: { connect: { alias } },
      reportingMonth,
      createdEvents,
      fraudEvents,
      totalCapturedEvents,
      vampRatio: Math.round(vampRatio * 1_000_000) / 1_000_000, // 6 decimal places
      vampType: (row[COL_TYPE] as string | null)?.trim() ?? 'Standard',
      vampAssessment,
      acquirerCountry: (row[COL_COUNTRY] as string | null)?.trim() ?? null,
      acquirerId: (row[COL_ACQUIRER] as string | null)?.trim() ?? null,
    });
  }

  return results;
}
