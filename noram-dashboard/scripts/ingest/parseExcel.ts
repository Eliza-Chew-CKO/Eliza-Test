import * as fs from 'fs';
import * as path from 'path';

// npm install xlsx
// import * as XLSX from 'xlsx';

interface IngestOptions {
  filePath: string;
  dryRun?: boolean;
}

const SHEET_MAP = {
  'NORAM Users - AW': 'users',
  'Data': 'accounts_and_financials',
  'BIN TPV - AW': 'bin_tpv',
  'Targets': 'targets',
  'Excessive VAMP': 'vamp',
  'Salesforce Opportunity Snapshot': 'opportunities',
  'Closed won opps': 'closed_won',
} as const;

export async function parseExcel({ filePath, dryRun = false }: IngestOptions) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // const workbook = XLSX.readFile(filePath);
  // Uncomment and install xlsx package to enable actual parsing

  console.log(`Parsing: ${path.basename(filePath)}`);
  console.log('Sheets to process:', Object.keys(SHEET_MAP).join(', '));

  // Each mapper handles column normalization for its sheet
  if (!dryRun) {
    // await mapUsers(workbook.Sheets[...]);
    // await mapAccounts(workbook.Sheets[...]);
    // await mapOpportunities(workbook.Sheets[...]);
    // await mapFinancials(workbook.Sheets[...]);
    // await mapTargets(workbook.Sheets[...]);
    // await mapVAMP(workbook.Sheets[...]);
  }
}

// CLI entry
if (require.main === module) {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith('--file='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');

  if (!fileArg) {
    console.error('Usage: ts-node parseExcel.ts --file=./export.xlsx [--dry-run]');
    process.exit(1);
  }

  parseExcel({ filePath: fileArg, dryRun })
    .then(() => console.log('Ingest complete.'))
    .catch((e) => { console.error(e); process.exit(1); });
}
