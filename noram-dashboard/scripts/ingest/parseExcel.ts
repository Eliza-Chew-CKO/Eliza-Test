/**
 * parseExcel.ts
 *
 * Entry point for the data ingestion pipeline.
 * Reads the source NORAM Excel workbook and routes each sheet to the
 * appropriate mapper, then upserts records into PostgreSQL via Prisma.
 *
 * Usage:
 *   npx ts-node scripts/ingest/parseExcel.ts --file path/to/noram-data.xlsx
 *
 * Sheet mapping:
 *   "NORAM Users - AW"              → mapUsers       (sales reps and account managers)
 *   "Data"                          → mapFinancials  (monthly fee/revenue per account)
 *   "BIN TPV - AW"                  → mapFinancials  (TPV data broken down by BIN)
 *   "Targets"                       → mapTargets     (monthly frontbook/backbook targets)
 *   "Excessive VAMP"                → mapVAMP        (VAMP fraud monitoring records)
 *   "Salesforce Opportunity Snapshot" → mapOpportunities (CRM pipeline snapshot)
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { mapUsers } from './mapUsers';
import { mapAccounts } from './mapAccounts';
import { mapOpportunities } from './mapOpportunities';
import { mapFinancials } from './mapFinancials';
import { mapTargets } from './mapTargets';
import { mapVAMP } from './mapVAMP';
// TODO: import { prisma } from '@noram/db';

// ─── Sheet name constants ─────────────────────────────────────────────────────

export type SheetName =
  | 'NORAM Users - AW'
  | 'Data'
  | 'BIN TPV - AW'
  | 'Targets'
  | 'Excessive VAMP'
  | 'Salesforce Opportunity Snapshot';

const ALL_SHEETS: SheetName[] = [
  'NORAM Users - AW',
  'Data',
  'BIN TPV - AW',
  'Targets',
  'Excessive VAMP',
  'Salesforce Opportunity Snapshot',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Reads a named sheet from a workbook and returns its rows as plain objects.
 * Uses header:1 to get raw row arrays, then converts using the first row as headers.
 */
export function readSheet(
  workbook: XLSX.WorkBook,
  sheetName: SheetName
): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.warn(`[ingest] Sheet "${sheetName}" not found — skipping.`);
    return [];
  }
  // header: 1 → array of arrays; defval: '' → empty cells become empty string
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false, // coerce all values to strings first; mappers handle type parsing
  });
}

/**
 * parseWorkbook
 *
 * Reads the Excel file, iterates over known sheets, and dispatches each to
 * its mapper. Returns a summary of how many records were parsed per sheet.
 */
export async function parseWorkbook(filePath: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  console.log(`[ingest] Reading workbook: ${filePath}`);
  const workbook = XLSX.readFile(filePath, { cellDates: true });

  const found = workbook.SheetNames;
  console.log(`[ingest] Sheets in workbook: ${found.join(', ')}`);

  // 1. Users (must be imported before accounts to satisfy foreign key)
  const userRows = readSheet(workbook, 'NORAM Users - AW');
  const users = mapUsers(userRows);
  console.log(`[ingest] Mapped ${users.length} users`);
  // TODO: await prisma.user.createMany({ data: users, skipDuplicates: true });

  // 2. Accounts — derived from financial data rows (accounts are implicit in the Data sheet)
  const dataRows = readSheet(workbook, 'Data');
  const accounts = mapAccounts(dataRows);
  console.log(`[ingest] Mapped ${accounts.length} accounts`);
  // TODO: upsert accounts

  // 3. Opportunities
  const sfRows = readSheet(workbook, 'Salesforce Opportunity Snapshot');
  const opportunities = mapOpportunities(sfRows);
  console.log(`[ingest] Mapped ${opportunities.length} opportunities`);
  // TODO: upsert opportunities

  // 4. Financial actuals — "Data" sheet
  const financials = mapFinancials(dataRows, 'DATA');
  console.log(`[ingest] Mapped ${financials.length} financial actuals (Data sheet)`);
  // TODO: upsert financials

  // 5. BIN TPV financial actuals
  const binRows = readSheet(workbook, 'BIN TPV - AW');
  const binFinancials = mapFinancials(binRows, 'BIN_TPV');
  console.log(`[ingest] Mapped ${binFinancials.length} BIN TPV records`);
  // TODO: upsert binFinancials

  // 6. Targets
  const targetRows = readSheet(workbook, 'Targets');
  const targets = mapTargets(targetRows);
  console.log(`[ingest] Mapped ${targets.length} targets`);
  // TODO: upsert targets

  // 7. VAMP records
  const vampRows = readSheet(workbook, 'Excessive VAMP');
  const vampRecords = mapVAMP(vampRows);
  console.log(`[ingest] Mapped ${vampRecords.length} VAMP records`);
  // TODO: upsert vampRecords

  console.log('[ingest] Done.');
}

// ─── CLI entrypoint ───────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const fileArgIndex = args.indexOf('--file');
  if (fileArgIndex === -1 || !args[fileArgIndex + 1]) {
    console.error('Usage: ts-node scripts/ingest/parseExcel.ts --file <path>');
    process.exit(1);
  }
  const filePath = path.resolve(args[fileArgIndex + 1]);
  parseWorkbook(filePath).catch((err) => {
    console.error('[ingest] Fatal error:', err);
    process.exit(1);
  });
}
