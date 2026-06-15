import * as fs from 'fs';
import * as path from 'path';

// Run: npm install xlsx
// import * as XLSX from 'xlsx';

interface IngestOptions {
  filePath: string;
  dryRun?: boolean;
}

// Maps Google Sheet tab names to internal handlers
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
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  console.log(`Parsing: ${path.basename(filePath)}`);
  console.log('Sheets to process:', Object.keys(SHEET_MAP).join(', '));

  // const workbook = XLSX.readFile(filePath);
  // Uncomment after: npm install xlsx

  if (!dryRun) {
    // await mapUsers(XLSX.utils.sheet_to_json(workbook.Sheets['NORAM Users - AW']));
    // await mapAccounts(XLSX.utils.sheet_to_json(workbook.Sheets['Data']));
    // await mapOpportunities(XLSX.utils.sheet_to_json(workbook.Sheets['Salesforce Opportunity Snapshot']));
    // await mapFinancials(XLSX.utils.sheet_to_json(workbook.Sheets['BIN TPV - AW']));
    // await mapTargets(XLSX.utils.sheet_to_json(workbook.Sheets['Targets']));
    // await mapVAMP(XLSX.utils.sheet_to_json(workbook.Sheets['Excessive VAMP']));
  }
}

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
