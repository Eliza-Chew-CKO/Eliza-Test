/**
 * parseExcel.ts
 *
 * Entry point for the data ingestion pipeline. Reads an Excel workbook and
 * dispatches each sheet to its dedicated mapper function.
 *
 * Usage:
 *   npx ts-node scripts/ingest/parseExcel.ts --file path/to/noram-data.xlsx
 *
 * Sheet-to-mapper mapping:
 *   "NORAM Users - AW"              → mapUsers     (sales reps and account managers)
 *   "Data"                          → mapFinancials (monthly fee/revenue data per account)
 *   "BIN TPV - AW"                  → mapFinancials (TPV data split by BIN type)
 *   "Targets"                       → mapTargets   (monthly frontbook/backbook targets)
 *   "Excessive VAMP"                → mapVAMP      (Visa VAMP fraud records)
 *   "Salesforce Opportunity Snapshot" → mapOpportunities (pipeline snapshot from SFDC)
 */

import * as path from 'path';
import * as XLSX from 'xlsx';
import { mapUsers } from './mapUsers';
import { mapAccounts } from './mapAccounts';
import { mapFinancials } from './mapFinancials';
import { mapTargets } from './mapTargets';
import { mapVAMP } from './mapVAMP';
import { mapOpportunities } from './mapOpportunities';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SheetName =
  | 'NORAM Users - AW'
  | 'Data'
  | 'BIN TPV - AW'
  | 'Targets'
  | 'Excessive VAMP'
  | 'Salesforce Opportunity Snapshot';

export type SheetRow = Record<string, any>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Reads a single sheet from a workbook and returns its rows as plain objects.
 * Uses xlsx's sheet_to_json with `defval: null` to preserve empty cells.
 */
export function readSheet(workbook: XLSX.WorkBook, sheetName: SheetName): SheetRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.warn(`[parseExcel] Sheet not found: "${sheetName}" — skipping`);
    return [];
  }
  return XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: null });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Parses the workbook at the given file path and dispatches each sheet
 * to the appropriate mapper. Returns a structured object containing all
 * mapped records, ready for upsert into the database.
 */
export async function parseWorkbook(filePath: string) {
  const absolutePath = path.resolve(filePath);
  console.log(`[parseExcel] Reading workbook: ${absolutePath}`);

  const workbook = XLSX.readFile(absolutePath, {
    cellDates: true,  // parse date cells as JS Date objects
    cellNF: false,    // skip number format strings
    cellText: false,  // skip formatted text
  });

  console.log(`[parseExcel] Sheets found: ${workbook.SheetNames.join(', ')}`);

  // ── "NORAM Users - AW" → sales reps and account managers ──────────────────
  const userRows = readSheet(workbook, 'NORAM Users - AW');
  const users = mapUsers(userRows);
  console.log(`[parseExcel] Mapped ${users.length} users`);

  // ── "Data" → monthly financial actuals per account ─────────────────────────
  const dataRows = readSheet(workbook, 'Data');
  const financialsData = mapFinancials(dataRows, 'DATA');
  console.log(`[parseExcel] Mapped ${financialsData.length} financial actuals (DATA sheet)`);

  // ── "BIN TPV - AW" → monthly TPV split by BIN type ────────────────────────
  const binRows = readSheet(workbook, 'BIN TPV - AW');
  const financialsBin = mapFinancials(binRows, 'BIN_TPV');
  console.log(`[parseExcel] Mapped ${financialsBin.length} financial actuals (BIN TPV sheet)`);

  // ── "Targets" → monthly frontbook / backbook / TPV targets ────────────────
  const targetRows = readSheet(workbook, 'Targets');
  const targets = mapTargets(targetRows);
  console.log(`[parseExcel] Mapped ${targets.length} targets`);

  // ── "Excessive VAMP" → VAMP fraud records ─────────────────────────────────
  const vampRows = readSheet(workbook, 'Excessive VAMP');
  const vampRecords = mapVAMP(vampRows);
  console.log(`[parseExcel] Mapped ${vampRecords.length} VAMP records`);

  // ── "Salesforce Opportunity Snapshot" → pipeline opportunities ────────────
  const oppRows = readSheet(workbook, 'Salesforce Opportunity Snapshot');
  const opportunities = mapOpportunities(oppRows);
  console.log(`[parseExcel] Mapped ${opportunities.length} opportunities`);

  // Accounts are derived from the financial actuals (unique account aliases)
  const accounts = mapAccounts(dataRows);
  console.log(`[parseExcel] Derived ${accounts.length} accounts`);

  return {
    users,
    accounts,
    financials: [...financialsData, ...financialsBin],
    targets,
    vampRecords,
    opportunities,
  };
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const fileArgIndex = args.indexOf('--file');

  if (fileArgIndex === -1 || !args[fileArgIndex + 1]) {
    console.error('Usage: ts-node parseExcel.ts --file <path-to-excel-file>');
    process.exit(1);
  }

  const filePath = args[fileArgIndex + 1];

  parseWorkbook(filePath)
    .then((result) => {
      console.log('\n[parseExcel] Parse complete. Summary:');
      console.log(`  Users:         ${result.users.length}`);
      console.log(`  Accounts:      ${result.accounts.length}`);
      console.log(`  Financials:    ${result.financials.length}`);
      console.log(`  Targets:       ${result.targets.length}`);
      console.log(`  VAMP Records:  ${result.vampRecords.length}`);
      console.log(`  Opportunities: ${result.opportunities.length}`);
      console.log('\nNext step: pipe this output to an upsert script.');
    })
    .catch((err: Error) => {
      console.error('[parseExcel] Fatal error:', err.message);
      process.exit(1);
    });
}
