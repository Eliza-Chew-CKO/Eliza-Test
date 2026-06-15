/**
 * mapVAMP.ts
 *
 * Maps rows from the "Excessive VAMP" sheet to Prisma VampRecordCreateInput objects.
 *
 * Expected sheet columns:
 *   - "Account"               → accountId (alias, resolved at upsert time)
 *   - "Month"                 → reportingMonth (first of month)
 *   - "Created Events"        → createdEvents
 *   - "Fraud Events"          → fraudEvents
 *   - "Total Captured Events" → totalCapturedEvents
 *   - "VAMP Ratio"            → vampRatio (if present; otherwise calculated)
 *   - "VAMP Type"             → vampType (e.g. "DOMESTIC" | "INTERNATIONAL")
 *   - "VAMP Assessment"       → vampAssessment (nullable)
 *   - "Acquirer Country"      → acquirerCountry (nullable)
 *   - "Acquirer ID"           → acquirerId (nullable)
 *
 * VAMP Ratio calculation (when not provided in the sheet):
 *   vampRatio = fraudEvents / totalCapturedEvents
 *
 * Classification thresholds:
 *   > 0.009 → EXCESSIVE
 *   > 0.005 → ELEVATED
 *   ≤ 0.005 → NORMAL
 */

import type { Prisma } from '@prisma/client';
import type { SheetRow } from './parseExcel';

// ─── Column constants ─────────────────────────────────────────────────────────
const COL_ACCOUNT   = 'Account';
const COL_MONTH     = 'Month';
const COL_CREATED   = 'Created Events';
const COL_FRAUD     = 'Fraud Events';
const COL_TOTAL     = 'Total Captured Events';
const COL_RATIO     = 'VAMP Ratio';
const COL_TYPE      = 'VAMP Type';
const COL_ASSESS    = 'VAMP Assessment';
const COL_COUNTRY   = 'Acquirer Country';
const COL_ACQUIRER  = 'Acquirer ID';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  if (typeof raw === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + raw * 86_400_000);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
  }
  return null;
}

function parseInteger(raw: any): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  const parsed = parseInt(raw.toString().replace(/,/g, ''), 10);
  return isNaN(parsed) ? 0 : parsed;
}

function parseRatio(raw: any): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return raw;
  const cleaned = raw.toString().replace(/%/g, '').trim();
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return null;
  // If the value looks like a percentage (e.g. 0.72 meaning 0.72%) normalise it
  return parsed > 1 ? parsed / 100 : parsed;
}

/**
 * Classifies a VAMP ratio into a tier label.
 */
export function classifyVampRatio(ratio: number): string {
  if (ratio > 0.009) return 'EXCESSIVE';
  if (ratio > 0.005) return 'ELEVATED';
  return 'NORMAL';
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

/**
 * Maps "Excessive VAMP" sheet rows to VampRecordCreateInput objects.
 * The vampRatio is either read from the sheet or calculated from createdEvents
 * and fraudEvents if not present.
 */
export function mapVAMP(rows: SheetRow[]): Prisma.VampRecordUncheckedCreateInput[] {
  const mapped: Prisma.VampRecordUncheckedCreateInput[] = [];

  for (const row of rows) {
    const alias = row[COL_ACCOUNT]?.toString().trim();
    if (!alias) continue;

    const reportingMonth = parseReportingMonth(row[COL_MONTH]);
    if (!reportingMonth) {
      console.warn('[mapVAMP] Skipping row with invalid month:', row);
      continue;
    }

    const createdEvents       = parseInteger(row[COL_CREATED]);
    const fraudEvents         = parseInteger(row[COL_FRAUD]);
    const totalCapturedEvents = parseInteger(row[COL_TOTAL]) || createdEvents;

    // Prefer the sheet-provided ratio; fall back to computing it
    let vampRatio = parseRatio(row[COL_RATIO]);
    if (vampRatio === null) {
      vampRatio = totalCapturedEvents > 0 ? fraudEvents / totalCapturedEvents : 0;
    }

    const vampType       = row[COL_TYPE]?.toString().trim() || 'DOMESTIC';
    const vampAssessment = row[COL_ASSESS]?.toString().trim() || classifyVampRatio(vampRatio);
    const acquirerCountry = row[COL_COUNTRY]?.toString().trim() || null;
    const acquirerId      = row[COL_ACQUIRER]?.toString().trim() || null;

    mapped.push({
      accountId: alias, // resolved to Account.id at upsert time
      reportingMonth,
      createdEvents,
      fraudEvents,
      totalCapturedEvents,
      vampRatio,
      vampType,
      vampAssessment,
      acquirerCountry,
      acquirerId,
    });
  }

  return mapped;
}
