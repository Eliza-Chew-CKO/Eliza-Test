# Data Ingestion Scripts

Parse exported `.xlsx` or `.csv` files from the Google Sheets prototype and load them into PostgreSQL.

## Usage

```bash
npm install xlsx ts-node

# Dry run (preview only)
npx ts-node scripts/ingest/parseExcel.ts --file=./data/noram-export.xlsx --dry-run

# Full ingest
npx ts-node scripts/ingest/parseExcel.ts --file=./data/noram-export.xlsx
```

## Sheet → Table Mapping

| Google Sheet Tab | Database Table | Mapper |
|---|---|---|
| NORAM Users - AW | User | mapUsers.ts |
| Data | Account + FinancialActual | mapAccounts.ts |
| BIN TPV - AW | FinancialActual (TPV) | mapFinancials.ts |
| Targets | Target | mapTargets.ts |
| Excessive VAMP | VampRecord | mapVAMP.ts |
| Salesforce Opportunity Snapshot | Opportunity | mapOpportunities.ts |
| Closed won opps | Opportunity (CLOSED_WON) | mapOpportunities.ts |
