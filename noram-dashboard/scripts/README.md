# Data Ingest Scripts

This directory contains scripts to parse the NORAM source Excel workbook and
load its data into the PostgreSQL database via Prisma.

## How to Run

```bash
npx ts-node scripts/ingest/parseExcel.ts --file path/to/NORAM_Data.xlsx
```

The script reads all known sheets from the workbook, maps each row to the
appropriate Prisma model shape, and upserts records into the database.

You can also run individual mapper scripts for debugging:

```bash
# Inspect mapped users
npx ts-node -e "
import { readSheet } from './scripts/ingest/parseExcel';
import { mapUsers } from './scripts/ingest/mapUsers';
import * as XLSX from 'xlsx';
const wb = XLSX.readFile('path/to/file.xlsx');
const rows = readSheet(wb, 'NORAM Users - AW');
console.log(mapUsers(rows));
"
```

## Script Overview

| Script | Source Sheet | Purpose |
|--------|-------------|---------|
| `parseExcel.ts` | — | Orchestrator: reads workbook, dispatches to mappers |
| `mapUsers.ts` | NORAM Users - AW | Maps sales reps and account managers to `User` |
| `mapAccounts.ts` | Data | Infers unique `Account` records from the Data sheet |
| `mapFinancials.ts` | Data, BIN TPV - AW | Maps monthly financials to `FinancialActual` |
| `mapTargets.ts` | Targets | Maps monthly targets to `Target` |
| `mapVAMP.ts` | Excessive VAMP | Maps VAMP records to `VampRecord` |
| `mapOpportunities.ts` | Salesforce Opportunity Snapshot | Maps pipeline to `Opportunity` |

## Expected Excel Sheet Structure

### 1. "NORAM Users - AW"

Sales reps and account managers.

| Column | Type | Notes |
|--------|------|-------|
| Name | string | Full name |
| Email | string | Work email (unique key) |
| Role | string | "AE", "AM", "Sales Manager", "VP Sales" |
| Sales Region | string | e.g. "NORAM East", "NORAM West", "Canada" |

### 2. "Data"

Monthly revenue data per account. One row per account per month.

| Column | Type | Notes |
|--------|------|-------|
| Account Alias | string | Account identifier |
| Month | date | Reporting month |
| Tier | string | "Enterprise" / "Mid-Market" / "SMB" |
| Managed | boolean | "Y" / "N" |
| Sales Rep | string | Rep name or ID |
| Account Manager | string | AM name or ID (optional) |
| Region | string | Geographic region |
| Go Live Date | date | Account go-live date |
| Total Fees | number | Gross fees |
| Gross FX | number | FX revenue |
| CCP Exclusion | number | CCP exclusion |
| Net Revenue | number | Net (can be calculated if absent) |
| TPV | number | Total payment volume |

### 3. "BIN TPV - AW"

TPV broken down by BIN type and acquirer.

| Column | Type | Notes |
|--------|------|-------|
| Account Alias | string | Account identifier |
| Month | date | Reporting month |
| BIN Type | string | "Credit", "Debit", "Prepaid", etc. |
| Acquirer ID | string | Acquiring bank identifier |
| TPV | number | Total payment volume for this BIN/acquirer |

### 4. "Targets"

Monthly revenue and go-live targets by type.

| Column | Type | Notes |
|--------|------|-------|
| Period | string | "YYYY-MM" or "Mon-YY" |
| Type | string | "Frontbook Base", "Frontbook Roll", "Backbook Managed", "Backbook Unmanaged", "TPV" |
| Amount | number | Target amount (USD) |
| Go-Live Count | number | Target go-live count (Frontbook Base only) |

### 5. "Excessive VAMP"

Accounts flagged for excessive VAMP (fraud events).

| Column | Type | Notes |
|--------|------|-------|
| Account Alias | string | Account identifier |
| Month | date | Reporting month |
| Created Events | integer | Total auth events |
| Fraud Events | integer | Confirmed fraud events |
| Total Captured Events | integer | Settled events |
| VAMP Ratio | decimal | Calculated if absent |
| VAMP Type | string | "Fraud" or "TC40" |
| VAMP Assessment | string | "Excessive" / "Normal" (derived if absent) |
| Acquirer Country | string | ISO country code |
| Acquirer ID | string | Acquirer identifier |

### 6. "Salesforce Opportunity Snapshot"

Pipeline snapshot exported from Salesforce.

| Column | Type | Notes |
|--------|------|-------|
| Opportunity ID | string | Salesforce ID |
| Account | string | Account name or alias |
| Owner | string | AE name or ID |
| Stage | string | Pipeline stage (normalised to internal taxonomy) |
| Type | string | "New Logo", "Expansion", "Renewal" |
| Base MNR | number | Base monthly new revenue |
| Roll MNR | number | Roll monthly new revenue |
| Close Date | date | Expected close date |
| Go-Live Date | date | Expected go-live (optional) |
| Rating | string | "A", "B", "C" |
| Second Owner | string | Secondary rep ID (optional) |

## Data Validation Notes

- Rows with missing required fields (account ID, reporting month) are skipped
  with a `console.warn` message.
- VAMP ratios are calculated from event counts if not present in the sheet.
- Stage names from Salesforce are normalised to the internal taxonomy
  (e.g. "Id. Decision Makers" → "Discovery").
- Tier inference falls back to "Mid-Market" for unrecognised values.
- All currency amounts are stored as `Decimal(15,2)` — values are parsed
  with commas and `$` symbols stripped.

## Re-Run / Upsert Logic

All inserts use Prisma `upsert` operations based on unique constraints:

| Model | Unique Key |
|-------|-----------|
| User | `email` |
| Account | `alias` (or a stable external ID if available) |
| FinancialActual | `(accountId, reportingMonth, binType, acquirerId)` |
| Target | `(period, type)` |
| VampRecord | `(accountId, reportingMonth, acquirerId)` |
| Opportunity | Salesforce `Opportunity ID` if present |

Re-running the script with the same file is safe — existing records will be
updated with the latest values from the spreadsheet.
