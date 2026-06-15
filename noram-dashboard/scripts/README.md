# Data Ingest Scripts

These scripts load data from an Excel workbook (.xlsx) into the NORAM Dashboard PostgreSQL database via Prisma.

---

## Overview

The main entry point is `parseExcel.ts`, which reads a workbook, dispatches each sheet to its dedicated mapper, and upserts the results into the database.

```
scripts/ingest/
├── parseExcel.ts        # Workbook reader and sheet dispatcher
├── mapUsers.ts          # "NORAM Users - AW" sheet
├── mapAccounts.ts       # Account data mapper (derives from Data sheet)
├── mapOpportunities.ts  # "Salesforce Opportunity Snapshot" sheet
├── mapFinancials.ts     # "Data" and "BIN TPV - AW" sheets
├── mapTargets.ts        # "Targets" sheet
└── mapVAMP.ts           # "Excessive VAMP" sheet
```

---

## How to Run

### Prerequisites

1. Database is running and `DATABASE_URL` is set in `.env`
2. Prisma client is generated: `npm run generate` from the repo root
3. Migrations have been applied: `npm run migrate`

### Run the ingestion

```bash
npx ts-node scripts/ingest/parseExcel.ts --file=path/to/data.xlsx
```

### Dry run (no database writes)

```bash
npx ts-node scripts/ingest/parseExcel.ts --file=path/to/data.xlsx --dry-run
```

The dry run logs what would be processed per sheet without touching the database.

---

## Expected Excel Sheet Structure

### Sheet 1: "NORAM Users - AW"

Maps to the `User` model.

| Column | Type | Required | Notes |
|---|---|---|---|
| Name | string | Yes | Full name |
| Email | string | Yes | Unique upsert key |
| Role | string | Yes | "Sales Rep", "Account Manager", "Revenue Ops", "Executive" |
| Sales Region | string | No | e.g. "US-East", "Canada" |

### Sheet 2: "Data"

Maps to the `FinancialActual` model (main revenue data, `binType = null`).

| Column | Type | Required | Notes |
|---|---|---|---|
| Alias | string | Yes | Must match an Account.alias |
| Month | string | Yes | "YYYY-MM" or any parseable date |
| Total Fees | number | Yes | Gross fees |
| Gross FX | number | No | FX revenue component |
| CCP Exclusion | number | No | Credit card processing exclusion |
| Net Revenue | number | Yes | Net revenue after exclusions |
| TPV | number | No | Total payment volume |
| Acquirer ID | string | No | Acquirer identifier |

### Sheet 3: "BIN TPV - AW"

Maps to `FinancialActual` rows with a populated `binType` (BIN-level TPV breakdown).

| Column | Type | Required | Notes |
|---|---|---|---|
| Alias | string | Yes | Must match Account.alias |
| Month | string | Yes | "YYYY-MM" |
| BIN Type | string | No | e.g. "VISA_CREDIT", "MASTERCARD_DEBIT" |
| TPV | number | Yes | Payment volume for this BIN |
| Acquirer ID | string | No | Acquirer identifier |

### Sheet 4: "Targets"

Maps to the `Target` model.

| Column | Type | Required | Notes |
|---|---|---|---|
| Period | string | Yes | "YYYY-MM" |
| Type | string | Yes | "Frontbook Base", "Frontbook Roll", "Backbook Managed", "Backbook Unmanaged", "TPV" |
| Amount | number | Yes | Target monetary value |
| GoLiveCount | number | No | Target go-live count (used with Frontbook Base) |

### Sheet 5: "Excessive VAMP"

Maps to the `VampRecord` model.

| Column | Type | Required | Notes |
|---|---|---|---|
| Alias | string | Yes | Must match Account.alias |
| Reporting Month | string | Yes | "YYYY-MM" |
| Acquirer | string | No | Acquirer ID |
| Acquirer Country | string | No | ISO country code |
| Created Events | number | Yes | Total transaction events |
| Fraud Events | number | Yes | Events flagged as fraudulent |
| Total Captured Events | number | Yes | Total settled events |
| VAMP Ratio | number | No | Pre-calculated; computed as fraudEvents/totalCapturedEvents if missing |

VAMP classification thresholds:
- **EXCESSIVE**: vampRatio > 0.015 AND fraudEvents > 1,500
- **Assessment charge** (EXCESSIVE only): (createdEvents + fraudEvents) × $8

### Sheet 6: "Salesforce Opportunity Snapshot"

Maps to the `Opportunity` model.

| Column | Type | Required | Notes |
|---|---|---|---|
| Opportunity ID | string | Yes | Salesforce 18-char ID |
| Account Name | string | Yes | Must match Account.alias |
| Owner Email | string | Yes | Must match a User.email |
| Second Owner Email | string | No | Co-owner |
| Stage | string | Yes | Salesforce stage (normalised to Discovery/Scoping/Proposal/Negotiation/Closed Won) |
| Type | string | No | "New Business", "Expansion", "Renewal" |
| Base MNR | number | No | Base monthly net revenue |
| Roll MNR | number | No | Roll (committed) monthly net revenue |
| Weighted MNR | number | No | Probability-adjusted MNR |
| Close Date | string | No | Expected close date |
| Go Live Date | string | No | Expected go-live date |
| Rating | string | No | "A", "B", "C" |

---

## Data Validation Notes

- **Missing accounts**: Rows with an Alias that doesn't match a known Account are skipped with a warning. Always run the Users and Accounts ingest before Financials, VAMP, and Opportunities.
- **Missing users**: Opportunity and Account rows with unresolved owner emails are skipped with a warning.
- **Date parsing**: Dates are parsed from multiple formats (ISO 8601, UK DD/MM/YYYY, Excel serial numbers). If a date cannot be parsed, the current date is used and a warning is logged.
- **Currency values**: Columns containing `$` signs or commas are cleaned before parsing.
- **VAMP ratio**: If the sheet provides a pre-calculated ratio it is used directly. Otherwise it is computed as `fraudEvents / totalCapturedEvents`.

---

## Re-run Handling (Upsert Logic)

All mappers use Prisma `upsert` operations with natural key constraints, so the scripts are safe to re-run:

| Model | Upsert Key |
|---|---|
| User | `email` |
| Account | `alias` |
| FinancialActual | `[accountId, reportingMonth, binType, acquirerId]` |
| Target | `[period, type]` |
| VampRecord | `[accountId, reportingMonth, acquirerId]` |
| Opportunity | Salesforce Opportunity ID (stored via `id` field) |

Re-running with the same file will update existing records with the latest values — no duplicates will be created.

---

## Troubleshooting

| Issue | Likely cause | Fix |
|---|---|---|
| `File not found` | Wrong `--file` path | Check the path relative to the monorepo root |
| `No account found for alias: X` | Accounts not yet ingested, or alias mismatch | Ingest Users → Accounts first; check for trailing spaces in the sheet |
| `Could not parse month: X` | Unexpected date format | Ensure the Month column is formatted as "YYYY-MM" or a recognisable date |
| Prisma `P2003` foreign key error | Referenced entity doesn't exist | Run ingestion in order: Users → Accounts → Financials/VAMP/Opportunities |
