/**
 * parseExcel.ts
 *
 * Main entry point for the NORAM data ingestion pipeline.
 *
 * Usage:
 *   npx ts-node scripts/ingest/parseExcel.ts --file path/to/NORAM_Data.xlsx
 *
 * Sheet → Purpose mapping:
 *   "NORAM Users - AW"                → mapUsers    — sales reps and account managers
 *   "Data"                            → mapFinancials — monthly fee/revenue data per account
 *   "BIN TPV - AW"                    → mapFinancials — TPV data broken down by BIN type
 *   "Targets"                         → mapTargets  — monthly frontbook/backbook/TPV targets
 *   "Excessive VAMP"                  → mapVAMP     — VAMP fraud ratio records per account
 *   "Salesforce Opportunity Snapshot" → mapOpportunities — Salesforce pipeline export
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import { mapUsers } from './mapUsers';
import { mapAccounts } from './mapAccounts';
import { mapOpportunities } from './mapOpportunities';
import { mapFinancials } from './mapFinancials';
import { mapTargets } from './mapTargets';
import { mapVAMP } from './mapVAMP';

// -----------------------------------------------------------------------
// Sheet name constants
// -----------------------------------------------------------------------
export type SheetName =
  | 'NORAM Users - AW'
  | 'Data'
  | 'BIN TPV - AW'
  | 'Targets'
  | 'Excessive VAMP'
  | 'Salesforce Opportunity Snapshot';

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/**
 * readSheet
 * Reads a named sheet from an xlsx Workbook and returns its rows as
 * an array of plain objects keyed by column header.
 */
export function readSheet(
  workbook: XLSX.WorkBook,
  sheetName: string
): Record<string, any>[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.warn(`[parseExcel] Sheet "${sheetName}" not found — skipping.`);
    return [];
  }
  return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
}

/**
 * parseWorkbook
 * Opens the xlsx file at filePath, iterates over all known sheets,
 * and dispatches each to the appropriate mapper function.
 *
 * Returns a summary of how many records were parsed per sheet.
 */
export async function parseWorkbook(filePath: string): Promise<Record<SheetName, number>> {
  console.log(`[parseExcel] Reading workbook: ${filePath}`);
  const workbook = XLSX.readFile(filePath, { cellDates: true });

  // --- Users ---
  const userRows = readSheet(workbook, 'NORAM Users - AW');
  const users = mapUsers(userRows);
  console.log(`[parseExcel] Users: ${users.length} records mapped`);
  // TODO: await prisma.user.createMany({ data: users, skipDuplicates: true });

  // --- Accounts ---
  // Accounts are derived from the "Data" sheet's unique account identifiers
  const dataRows = readSheet(workbook, 'Data');
  const accounts = mapAccounts(dataRows);
  console.log(`[parseExcel] Accounts: ${accounts.length} records mapped`);
  // TODO: upsert accounts

  // --- Financials — Data sheet ---
  const financialsData = mapFinancials(dataRows, 'DATA');
  console.log(`[parseExcel] Financials (Data): ${financialsData.length} records mapped`);
  // TODO: prisma.financialActual.createMany({ data: financialsData, skipDuplicates: true });

  // --- Financials — BIN TPV ---
  const binTpvRows = readSheet(workbook, 'BIN TPV - AW');
  const financialsBin = mapFinancials(binTpvRows, 'BIN_TPV');
  console.log(`[parseExcel] Financials (BIN TPV): ${financialsBin.length} records mapped`);

  // --- Targets ---
  const targetRows = readSheet(workbook, 'Targets');
  const targets = mapTargets(targetRows);
  console.log(`[parseExcel] Targets: ${targets.length} records mapped`);
  // TODO: upsert targets

  // --- VAMP ---
  const vampRows = readSheet(workbook, 'Excessive VAMP');
  const vampRecords = mapVAMP(vampRows);
  console.log(`[parseExcel] VAMP records: ${vampRecords.length} records mapped`);

  // --- Opportunities ---
  const oppRows = readSheet(workbook, 'Salesforce Opportunity Snapshot');
  const opportunities = mapOpportunities(oppRows);
  console.log(`[parseExcel] Opportunities: ${opportunities.length} records mapped`);

  return {
    'NORAM Users - AW': users.length,
    'Data': financialsData.length,
    'BIN TPV - AW': financialsBin.length,
    'Targets': targets.length,
    'Excessive VAMP': vampRecords.length,
    'Salesforce Opportunity Snapshot': opportunities.length,
  };
}

// -----------------------------------------------------------------------
// CLI entry point
// -----------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  if (fileIdx === -1 || !args[fileIdx + 1]) {
    console.error('Usage: ts-node parseExcel.ts --file <path-to-xlsx>');
    process.exit(1);
  }
  const filePath = path.resolve(args[fileIdx + 1]);
  const summary = await parseWorkbook(filePath);
  console.log('\n[parseExcel] Ingestion complete. Summary:');
  Object.entries(summary).forEach(([sheet, count]) => {
    console.log(`  ${sheet}: ${count} records`);
  });
}

main().catch((err) => {
  console.error('[parseExcel] Fatal error:', err);
  process.exit(1);
});
