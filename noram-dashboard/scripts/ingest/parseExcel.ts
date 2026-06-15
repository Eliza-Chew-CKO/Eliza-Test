/**
 * parseExcel.ts
 *
 * Entry point for the NORAM data ingestion pipeline.
 *
 * Reads a multi-sheet Excel workbook and dispatches each sheet to the
 * appropriate mapper function, then upserts the records into PostgreSQL
 * via Prisma.
 *
 * Usage:
 *   npx ts-node scripts/ingest/parseExcel.ts --file path/to/NORAM_Data.xlsx
 *
 * Sheet → Purpose mapping:
 *   "NORAM Users - AW"               → mapUsers         — sales reps and account managers
 *   "Data"                           → mapFinancials     — monthly fee / revenue data per account
 *   "BIN TPV - AW"                   → mapFinancials     — TPV data broken down by BIN / acquirer
 *   "Targets"                        → mapTargets        — monthly frontbook / backbook targets
 *   "Excessive VAMP"                 → mapVAMP           — VAMP fraud event records
 *   "Salesforce Opportunity Snapshot"→ mapOpportunities  — pipeline snapshot from Salesforce
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import * as process from 'process';
import { mapUsers } from './mapUsers';
import { mapFinancials } from './mapFinancials';
import { mapTargets } from './mapTargets';
import { mapVAMP } from './mapVAMP';
import { mapOpportunities } from './mapOpportunities';
import { mapAccounts } from './mapAccounts';

// ─── Sheet name constants ──────────────────────────────────────────────────────

export type SheetName =
  | 'NORAM Users - AW'
  | 'Data'
  | 'BIN TPV - AW'
  | 'Targets'
  | 'Excessive VAMP'
  | 'Salesforce Opportunity Snapshot';

export const SHEET_NAMES: SheetName[] = [
  'NORAM Users - AW',
  'Data',
  'BIN TPV - AW',
  'Targets',
  'Excessive VAMP',
  'Salesforce Opportunity Snapshot',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Reads a named sheet from an XLSX workbook and returns its rows as
 * an array of plain objects keyed by header row values.
 */
export function readSheet(
  workbook: XLSX.WorkBook,
  sheetName: string
): Record<string, unknown>[] {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    console.warn(`[parseExcel] Sheet "${sheetName}" not found in workbook — skipping.`);
    return [];
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: null,
    raw:    false, // parse dates as strings for consistent handling
  });
}

/**
 * Reads the workbook at filePath, iterates over all known sheets,
 * and dispatches each sheet's rows to the appropriate mapper.
 */
export async function parseWorkbook(filePath: string): Promise<void> {
  console.log(`[parseExcel] Reading workbook: ${filePath}`);

  const workbook = XLSX.readFile(filePath);

  // Log available sheets for debugging
  console.log(`[parseExcel] Sheets found: ${workbook.SheetNames.join(', ')}`);

  // ── 1. Users ────────────────────────────────────────────────────────────────
  // "NORAM Users - AW" — sales reps, account managers, their regions and roles.
  {
    const rows = readSheet(workbook, 'NORAM Users - AW');
    console.log(`[parseExcel] "NORAM Users - AW" — ${rows.length} rows`);
    const users = mapUsers(rows);
    console.log(`[parseExcel] Mapped ${users.length} users`);
    // TODO: await prisma.$transaction(users.map(u => prisma.user.upsert({ where: { email: u.email }, create: u, update: u })));
  }

  // ── 2. Accounts (derived from "Data" sheet account column) ─────────────────
  // Accounts are not in a dedicated sheet; they are inferred from the Data sheet.
  {
    const rows = readSheet(workbook, 'Data');
    const accounts = mapAccounts(rows);
    console.log(`[parseExcel] Mapped ${accounts.length} accounts from "Data"`);
    // TODO: upsert accounts
  }

  // ── 3. Monthly financials — standard fees/revenue ──────────────────────────
  // "Data" sheet: one row per account per month with fee breakdown.
  {
    const rows = readSheet(workbook, 'Data');
    console.log(`[parseExcel] "Data" — ${rows.length} rows`);
    const financials = mapFinancials(rows, 'DATA');
    console.log(`[parseExcel] Mapped ${financials.length} FinancialActual records from "Data"`);
    // TODO: upsert financials (@@unique on accountId+reportingMonth+binType+acquirerId)
  }

  // ── 4. BIN TPV data ─────────────────────────────────────────────────────────
  // "BIN TPV - AW" sheet: TPV broken down by BIN type and acquirer.
  {
    const rows = readSheet(workbook, 'BIN TPV - AW');
    console.log(`[parseExcel] "BIN TPV - AW" — ${rows.length} rows`);
    const financials = mapFinancials(rows, 'BIN_TPV');
    console.log(`[parseExcel] Mapped ${financials.length} FinancialActual (BIN TPV) records`);
    // TODO: upsert
  }

  // ── 5. Targets ──────────────────────────────────────────────────────────────
  // "Targets" sheet: monthly frontbook / backbook revenue and go-live targets.
  {
    const rows = readSheet(workbook, 'Targets');
    console.log(`[parseExcel] "Targets" — ${rows.length} rows`);
    const targets = mapTargets(rows);
    console.log(`[parseExcel] Mapped ${targets.length} Target records`);
    // TODO: upsert (@@unique on period+type)
  }

  // ── 6. VAMP records ─────────────────────────────────────────────────────────
  // "Excessive VAMP" sheet: fraud event counts per account per month.
  {
    const rows = readSheet(workbook, 'Excessive VAMP');
    console.log(`[parseExcel] "Excessive VAMP" — ${rows.length} rows`);
    const vamp = mapVAMP(rows);
    console.log(`[parseExcel] Mapped ${vamp.length} VampRecord records`);
    // TODO: upsert (@@unique on accountId+reportingMonth+acquirerId)
  }

  // ── 7. Salesforce opportunities ─────────────────────────────────────────────
  // "Salesforce Opportunity Snapshot" sheet: pipeline stage data.
  {
    const rows = readSheet(workbook, 'Salesforce Opportunity Snapshot');
    console.log(`[parseExcel] "Salesforce Opportunity Snapshot" — ${rows.length} rows`);
    const opps = mapOpportunities(rows);
    console.log(`[parseExcel] Mapped ${opps.length} Opportunity records`);
    // TODO: upsert
  }

  console.log('[parseExcel] Done.');
}

// ─── CLI entrypoint ───────────────────────────────────────────────────────────

if (require.main === module) {
  const fileArgIdx = process.argv.indexOf('--file');
  if (fileArgIdx === -1 || !process.argv[fileArgIdx + 1]) {
    console.error('Usage: ts-node scripts/ingest/parseExcel.ts --file <path/to/file.xlsx>');
    process.exit(1);
  }

  const filePath = path.resolve(process.argv[fileArgIdx + 1]);
  parseWorkbook(filePath).catch((err) => {
    console.error('[parseExcel] Fatal error:', err);
    process.exit(1);
  });
}
