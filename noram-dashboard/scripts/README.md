# Data Ingestion Scripts

These scripts parse exported `.xlsx` or `.csv` files from the Google Sheets prototype and load them into the PostgreSQL database.

## Usage

```bash
# Install dependencies first
npm install xlsx ts-node

# Run the ingestion (dry run to preview)
npx ts-node scripts/ingest/parseExcel.ts --file=./data/noram-export.xlsx --dry-run

# Full ingest
npx ts-node scripts/ingest/parseExcel.ts --file=./data/noram-export.xlsx
```

## Sheet → Table Mapping

| Google Sheet Tab | Database Table | Mapper Script |
|---|---|---|
| NORAM Users - AW | User | mapUsers.ts |
| Data | Account + FinancialActual | mapAccounts.ts, mapFinancials.ts |
| BIN TPV - AW | FinancialActual (TPV rows) | mapFinancials.ts |
| Targets | Target | mapTargets.ts |
| Excessive VAMP | VampRecord | mapVAMP.ts |
| Salesforce Opportunity Snapshot | Opportunity | mapOpportunities.ts |
| Closed won opps | Opportunity (CLOSED_WON) | mapOpportunities.ts |

## Column Expectations

Each mapper has TypeScript interfaces at the top defining the expected column headers. If the export format changes, update the interface and field mapping in the relevant mapper script.
