import * as path from 'path';
import * as XLSX from 'xlsx';
import { mapUsers } from './mapUsers';
import { mapAccounts } from './mapAccounts';
import { mapOpportunities } from './mapOpportunities';
import { mapFinancials } from './mapFinancials';
import { mapTargets } from './mapTargets';
import { mapVAMP } from './mapVAMP';
import { prisma } from '../../packages/db/src';

export type WorkbookSheets = {
  'NORAM Users - AM': XLSX.WorkSheet;
  'Users - Sales': XLSX.WorkSheet;
  '1. CM - FB': XLSX.WorkSheet;
  '1. CM - BB': XLSX.WorkSheet;
  '2. TPV - US Bin': XLSX.WorkSheet;
  'Targets': XLSX.WorkSheet;
  '4. Excessive VAMP': XLSX.WorkSheet;
  '6. VAMP flags': XLSX.WorkSheet;
  'Closed won opps': XLSX.WorkSheet;
  'Weighted pipeline': XLSX.WorkSheet;
  '5. Opp created': XLSX.WorkSheet;
  '5. Explore meetings ': XLSX.WorkSheet;
  '5. Propose ': XLSX.WorkSheet;
  '5. Trade ': XLSX.WorkSheet;
  '5. Handover ': XLSX.WorkSheet;
  '5. MAF submitted': XLSX.WorkSheet;
  '5. Technical ': XLSX.WorkSheet;
  '5. Underwriting': XLSX.WorkSheet;
  '3. Go-lives': XLSX.WorkSheet;
  '7. AM targets': XLSX.WorkSheet;
};

export function readSheet<T = Record<string, unknown>>(
  wb: XLSX.WorkBook,
  sheetName: string,
  headerRow = 1,
): T[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.warn(`  ⚠ Sheet "${sheetName}" not found — skipping`);
    return [];
  }
  const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' });
  const headers = raw[headerRow] as string[];
  const rows: T[] = [];
  for (let i = headerRow + 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    if (row.every((v) => v === '' || v === null || v === undefined)) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      obj[String(h).trim()] = row[idx] ?? '';
    });
    rows.push(obj as T);
  }
  return rows;
}

/** Convert an Excel serial date number to a JS Date (UTC midnight). */
export function excelDateToJs(serial: number | string | ''): Date | null {
  if (serial === '' || serial == null) return null;
  const n = typeof serial === 'string' ? parseFloat(serial) : serial;
  if (isNaN(n) || n <= 0) return null;
  // Excel epoch: 1 Jan 1900 = day 1 (with Lotus 1-2-3 leap-year bug)
  const utc = (n - 25569) * 86400 * 1000;
  return new Date(utc);
}

/** Parse a value that may be a number, numeric string, or blank into a float. */
export function toFloat(v: unknown): number | null {
  if (v === '' || v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

export async function parseAndIngest(filePath: string, dryRun = false) {
  console.log(`\n📂 Reading: ${path.basename(filePath)}`);
  const wb = XLSX.readFile(filePath);
  console.log(`   Sheets found: ${wb.SheetNames.length}`);

  // Order matters: Users → Accounts → everything else
  console.log('\n1/7 Ingesting users...');
  await mapUsers(wb, prisma, dryRun);

  console.log('\n2/7 Ingesting accounts...');
  await mapAccounts(wb, prisma, dryRun);

  console.log('\n3/7 Ingesting opportunities & pipeline snapshots...');
  await mapOpportunities(wb, prisma, dryRun);

  console.log('\n4/7 Ingesting financial actuals (FB + BB + TPV)...');
  await mapFinancials(wb, prisma, dryRun);

  console.log('\n5/7 Ingesting targets...');
  await mapTargets(wb, prisma, dryRun);

  console.log('\n6/7 Ingesting VAMP records...');
  await mapVAMP(wb, prisma, dryRun);

  console.log('\n✅ Ingest complete.\n');
}

// ─── CLI entry point ───────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith('--file='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');

  if (!fileArg) {
    console.error('Usage: ts-node parseExcel.ts --file=./export.xlsx [--dry-run]');
    process.exit(1);
  }

  parseAndIngest(path.resolve(fileArg), dryRun)
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
