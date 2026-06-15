# NORAM Data Ingestion Scripts

This directory contains TypeScript scripts for ingesting data from the NORAM Excel workbook into the PostgreSQL database via Prisma.

---

## How to Run

```bash
# From the repo root
npx ts-node scripts/ingest/parseExcel.ts --file path/to/NORAM_Data.xlsx
```

You can also run with a relative path:

```bash
npx ts-node scripts/ingest/parseExcel.ts --file ./data/NORAM_Q2_2025.xlsx
```

The script will log a summary of how many records were parsed per sheet.

---

## What Each Script Does

| Script | Purpose |
|---|---|
| `parseExcel.ts` | Entry point — opens the workbook, reads each sheet, dispatches to the appropriate mapper, logs counts |
| `mapUsers.ts` | Maps "NORAM Users - AW" → `User` inserts |
| `mapAccounts.ts` | Maps unique accounts from "Data" sheet → `Account` inserts |
| `mapOpportunities.ts` | Maps "Salesforce Opportunity Snapshot" → `Opportunity` inserts |
| `mapFinancials.ts` | Maps "Data" and "BIN TPV - AW" → `FinancialActual` inserts |
| `mapTargets.ts` | Maps "Targets" → `Target` inserts |
| `mapVAMP.ts` | Maps "Excessive VAMP" → `VampRecord` inserts |

---

## Expected Excel Sheet Structure

### Sheet: "NORAM Users - AW"

Sales reps and account managers.

| Column | Type | Notes |
|---|---|---|
| Name | String | Full display name |
| Email | String | Unique key — used for upserts |
| Role | String | "AE", "SDR", "AM", "Manager" |
| Sales Region | String | "NORAM East", "NORAM West", etc. |

---

### Sheet: "Data"

Monthly financial actuals per account.

| Column | Type | Notes |
|---|---|---|
| Account Alias | String | Links to Account |
| Reporting Month | Date/String | First day of month |
| Total Fees | Number | Gross fee revenue |
| Gross FX | Number | Gross FX revenue |
| CCP Exclusion | Number | Commercial Card Programme deduction |
| Net Revenue | Number | totalFees + grossFX − ccpExclusion |
| TPV Amount | Number | Total Processing Volume |

---

### Sheet: "BIN TPV - AW"

TPV broken down by BIN type and acquirer.

| Column | Type | Notes |
|---|---|---|
| Account Alias | String | Links to Account |
| Reporting Month | Date/String | First day of month |
| TPV Amount | Number | Processing volume for this BIN |
| BIN Type | String | "Debit", "Credit", "Commercial", "Prepaid" |
| Acquirer ID | String | Acquirer identifier |

---

### Sheet: "Targets"

Monthly frontbook, backbook, and TPV targets.

| Column | Type | Notes |
|---|---|---|
| Period | String/Date | "YYYY-MM" or Excel date |
| Type | String | See TargetType enum values below |
| Amount | Number | Revenue or TPV target |
| Go Live Count | Number | Only for FRONTBOOK_BASE rows |

Target type values (case-insensitive):
- `frontbook base` → `FRONTBOOK_BASE`
- `frontbook roll` → `FRONTBOOK_ROLL`
- `backbook managed` → `BACKBOOK_MANAGED`
- `backbook unmanaged` → `BACKBOOK_UNMANAGED`
- `tpv` → `TPV`

---

### Sheet: "Excessive VAMP"

Visa Acquirer Monitoring Programme fraud ratio records.

| Column | Type | Notes |
|---|---|---|
| Account Alias | String | Links to Account |
| Reporting Month | Date/String | First day of month |
| Created Events | Number | Total transaction events created |
| Fraud Events | Number | Fraudulent events |
| Total Captured Events | Number | Successfully captured events |
| VAMP Ratio | Number | fraudEvents / totalCapturedEvents (computed if absent) |
| VAMP Type | String | "Standard" or "CNP" |
| VAMP Assessment | String | "Acceptable" / "Elevated" / "Excessive" (classified if absent) |
| Acquirer Country | String | ISO 2-letter country code |
| Acquirer ID | String | Acquirer identifier |

---

### Sheet: "Salesforce Opportunity Snapshot"

Pipeline data exported from Salesforce.

| Column | Type | Notes |
|---|---|---|
| Opportunity ID | String | Salesforce ID (for dedup) |
| Account Name | String | Links to Account.alias |
| Owner Email | String | Links to User |
| Stage | String | Salesforce stage name (normalised) |
| Type | String | "New Business" / "Existing Business" |
| Base MNR | Number | Base monthly revenue |
| Roll MNR | Number | Roll-on monthly revenue |
| Weighted MNR | Number | Pre-weighted value (computed if absent) |
| Close Date | Date | Expected close date |
| Go Live Date | Date | Expected go-live date |
| Rating | String | "Hot" / "Warm" / "Cold" |

---

## Data Validation Notes

- **Email** is the unique key for User records. Rows without a valid email are skipped.
- **Account Alias** is the unique key for Account records. Case-sensitive matching.
- **Reporting Month** is normalised to the first day of the month before insert.
- **VAMP Ratio** is computed (`fraudEvents / totalCapturedEvents`) if the column is zero or missing.
- **VAMP Assessment** is classified against standard thresholds if missing:
  - < 0.5% → Acceptable
  - 0.5–0.99% → Elevated
  - ≥ 1.0% → Excessive
- Decimal values with currency symbols (`$`, `£`, `€`) are stripped before parsing.

---

## Handling Re-runs (Upsert Logic)

All insert operations should use Prisma's `createMany` with `skipDuplicates: true`, or `upsert` on the natural unique key:

| Model | Unique Key |
|---|---|
| User | `email` |
| Account | `alias` |
| FinancialActual | `(accountId, reportingMonth, binType, acquirerId)` |
| Target | `(period, type)` |
| VampRecord | `(accountId, reportingMonth, acquirerId)` |

Re-running the script against the same file is safe — existing records will be skipped or updated depending on the upsert strategy chosen in `parseExcel.ts`.
