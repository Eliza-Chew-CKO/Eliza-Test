# NORAM Dashboard — Data Ingestion Scripts

This directory contains TypeScript scripts for ingesting the source Excel workbook into the PostgreSQL database via Prisma.

## Overview

The ingestion pipeline reads a single Excel workbook (provided by the NORAM team) that contains 6 sheets, maps each sheet to the corresponding database model, and upserts the records.

## How to Run

```bash
# From the repo root
npx ts-node scripts/ingest/parseExcel.ts --file path/to/noram-data.xlsx
```

This command parses the workbook, prints a summary of mapped records, and outputs them. To actually write to the database, pipe the output into an upsert script (see below).

### Full ingest with database writes

```bash
# Dry run — parse and print only
npx ts-node scripts/ingest/parseExcel.ts --file ./data/noram-q2-2025.xlsx

# Full ingest (once upsert script is implemented)
npx ts-node scripts/ingest/upsert.ts --file ./data/noram-q2-2025.xlsx
```

## Expected Excel Sheet Structure

### Sheet 1: `NORAM Users - AW`

Maps to: `User` model

| Column | Description | Example |
|--------|-------------|---------|
| Name | Full name | Alice Johnson |
| Email | Unique email (used as upsert key) | alice@co.com |
| Role | Job role | Account Executive / AE |
| Region | Sales region | US East |

**Notes:** Role values are normalised (e.g. "Account Executive" → "AE").

---

### Sheet 2: `Data`

Maps to: `FinancialActual` model (monthly revenue actuals)

| Column | Description |
|--------|-------------|
| Account | Account alias (must match an existing account) |
| Month | Reporting month (any parseable date format) |
| Total Fees | Gross fees before exclusions |
| Gross FX | FX revenue component |
| CCP Exclusion | CCP scheme fee exclusions |
| Net Revenue | Net revenue after exclusions |
| TPV | Total payment volume |

**Unique key:** `[accountId, reportingMonth, null binType, null acquirerId]`

---

### Sheet 3: `BIN TPV - AW`

Maps to: `FinancialActual` model (TPV split by BIN type)

| Column | Description |
|--------|-------------|
| Account | Account alias |
| Month | Reporting month |
| BIN Type | DEBIT / CREDIT / PREPAID |
| Acquirer ID | Acquirer identifier |
| TPV | Total payment volume for this BIN/acquirer combination |

**Unique key:** `[accountId, reportingMonth, binType, acquirerId]`

---

### Sheet 4: `Targets`

Maps to: `Target` model

| Column | Description |
|--------|-------------|
| Period | "YYYY-MM" or "Jan 2025" format |
| Type | Frontbook Base / Frontbook Roll / Backbook Managed / Backbook Unmanaged / TPV |
| Amount | Target revenue or TPV amount |
| Go Live Count | Target number of go-lives (Frontbook Base only) |

**Unique key:** `[period, type]`

---

### Sheet 5: `Excessive VAMP`

Maps to: `VampRecord` model

| Column | Description |
|--------|-------------|
| Account | Account alias |
| Month | Reporting month |
| Created Events | Total authorisation events |
| Fraud Events | Number of fraud events |
| Total Captured Events | Total captured transaction events |
| VAMP Ratio | Fraud ratio (calculated if absent) |
| VAMP Type | DOMESTIC / INTERNATIONAL |
| VAMP Assessment | Free text assessment (optional) |
| Acquirer Country | ISO country code |
| Acquirer ID | Acquirer identifier |

**VAMP Ratio calculation:** `fraudEvents / totalCapturedEvents` (if not provided in sheet).

**Unique key:** `[accountId, reportingMonth, acquirerId]`

---

### Sheet 6: `Salesforce Opportunity Snapshot`

Maps to: `Opportunity` model

| Column | Description |
|--------|-------------|
| Account Name | Account alias |
| Owner | Sales rep name or email |
| Stage | Pipeline stage (normalised to standard values) |
| Type | New Logo / Expansion / Renewal |
| Base MNR | Base monthly net revenue commitment |
| Roll MNR | Expected monthly revenue after ramp |
| Weighted MNR | Stage-probability-weighted MNR |
| Close Date | Expected close date |
| Go Live Date | Expected go-live (optional) |
| Rating | Hot / Warm / Cold (optional) |
| Second Owner | Overlay rep (optional) |

---

## Data Validation Notes

- **Missing required fields:** Rows missing `email` (Users), `alias` (Accounts), `closeDate` (Opportunities), or `reportingMonth` (Financials/VAMP) are skipped with a console warning.
- **Date parsing:** Dates are parsed from JS Date objects (xlsx with `cellDates: true`), ISO strings, human-readable strings ("Jan 2025"), and Excel serial numbers.
- **Currency parsing:** Currency strings like `"$1,250,000"` are stripped of symbols and commas before parsing.
- **Type normalisation:** Stage names, account tiers, user roles, and target types are all normalised from their raw Excel values to canonical enum strings.

## Re-runs and Upsert Logic

All mappers produce objects with natural unique keys that map to Prisma `@@unique` constraints:

| Model | Upsert key |
|-------|-----------|
| User | `email` |
| Account | `alias` (per-run dedup only; use cuid for DB) |
| FinancialActual | `[accountId, reportingMonth, binType, acquirerId]` |
| Target | `[period, type]` |
| VampRecord | `[accountId, reportingMonth, acquirerId]` |
| Opportunity | External Salesforce ID (add `sfId` field if available) |

The upsert script should use `prisma.<model>.upsert({ where: <uniqueKey>, create: ..., update: ... })` for all records so that re-running the ingest with an updated file safely overwrites existing data without creating duplicates.
