# Data Ingestion Scripts

This directory contains TypeScript scripts for ingesting NORAM sales data from Excel exports into the PostgreSQL database.

---

## Overview

Each script in `scripts/ingest/` handles one or more Excel sheet tabs and maps their rows to Prisma model inputs. The main entry point (`parseExcel.ts`) orchestrates the full pipeline.

---

## Running the Scripts

### Full ingestion

```bash
# From the repo root
npx ts-node scripts/ingest/parseExcel.ts --file /path/to/NORAM_Data.xlsx
```

### Prerequisites

- `ts-node` installed (available via `npm install` at repo root)
- `DATABASE_URL` set in `.env` (Prisma client needs it)
- Prisma migrations run: `cd packages/db && npx prisma migrate dev`

---

## Script Reference

| File | Sheet | Purpose |
|---|---|---|
| `parseExcel.ts` | All | Main entry point — reads workbook, dispatches to mappers |
| `mapUsers.ts` | NORAM Users - AW | Maps sales reps and AMs to User records |
| `mapAccounts.ts` | Data | Derives unique Account records from financial data |
| `mapOpportunities.ts` | Salesforce Opportunity Snapshot | Maps SF opportunities to pipeline records |
| `mapFinancials.ts` | Data, BIN TPV - AW | Maps monthly revenue/fee actuals per account |
| `mapTargets.ts` | Targets | Maps monthly frontbook/backbook/TPV targets |
| `mapVAMP.ts` | Excessive VAMP | Maps VAMP fraud ratio records |

---

## Expected Excel Sheet Structure

### "NORAM Users - AW"

| Column | Required | Notes |
|---|---|---|
| Name / Full Name | Yes | Display name |
| Email | Yes | Unique key for upsert |
| Role / Title | No | AE, AM, Manager, Director |
| Region / Territory | No | US-West, US-East, Canada, LATAM |

### "Data"

| Column | Required | Notes |
|---|---|---|
| Account | Yes | Account alias (unique within sheet) |
| Month / Reporting Month | Yes | Format: "Jan 2025" or "YYYY-MM" |
| Total Fees | No | Gross fees before exclusions |
| Gross FX | No | FX revenue component |
| CCP Exclusion | No | CCP programme exclusions |
| Net Revenue | No | Net after exclusions |
| TPV | No | Total processed volume |
| Tier / Segment | No | Enterprise / Mid-Market / SMB |
| Managed / Account Type | No | Yes/No or Managed/Unmanaged |
| Rep / Sales Rep | No | Sales rep name or ID |
| AM / Account Manager | No | Account manager name or ID |
| Go Live / Go-Live Date | No | Date format |
| Region / Territory | No | Geographic region |

### "BIN TPV - AW"

| Column | Required | Notes |
|---|---|---|
| Account / Merchant | Yes | Account alias |
| Month / Period | Yes | Reporting month |
| BIN / BIN Type | No | e.g. Domestic, International |
| Acquirer / Acquirer ID | No | Acquirer reference |
| TPV / Volume | No | Processed volume for this BIN+acquirer |

### "Targets"

| Column | Required | Notes |
|---|---|---|
| Period / Month | Yes | "YYYY-MM" or "Mon YYYY" |
| Type / Target Type | Yes | See target type mapping below |
| Amount / Target Amount | No | Monetary target in USD |
| Go Live Count / Go Lives | No | Integer go-live target |

**Target type mapping:**

| Sheet value | Enum |
|---|---|
| Frontbook Base | FRONTBOOK_BASE |
| Frontbook Roll | FRONTBOOK_ROLL |
| Backbook Managed | BACKBOOK_MANAGED |
| Backbook Unmanaged | BACKBOOK_UNMANAGED |
| TPV | TPV |

### "Excessive VAMP"

| Column | Required | Notes |
|---|---|---|
| Account / Merchant | Yes | Account alias |
| Month / Reporting Month | Yes | Reporting month |
| Created / Created Events | No | Total transactions |
| Fraud / Fraud Events | No | Fraud/disputed events |
| Total Captured Events | No | Denominator for ratio calculation |
| VAMP Ratio / Ratio | No | Calculated if absent |
| Type / VAMP Type | No | Dispute or Fraud |
| Assessment | No | Classified from ratio if absent |
| Country / Acquirer Country | No | ISO country code |
| Acquirer / Acquirer ID | No | Acquirer reference |

### "Salesforce Opportunity Snapshot"

| Column | Required | Notes |
|---|---|---|
| Account / Account Name | Yes | Account alias |
| Owner / Rep / AE | No | Sales rep name |
| Stage / Opportunity Stage | No | Normalised to canonical stage names |
| Type / Opportunity Type | No | New Logo / Expansion / Renewal |
| Base MNR | No | Base monthly net revenue |
| Roll MNR | No | Roll-up monthly net revenue |
| Weighted MNR / Expected MNR | No | Probability-weighted MNR |
| Close Date | Yes | Expected close date |
| Go Live / Go-Live Date | No | Expected go-live date |
| Rating | No | Hot / Warm / Cold |
| Second Owner / Co-Owner | No | Secondary AE |

---

## Data Validation Notes

- **Email uniqueness**: User rows without a valid email are skipped.
- **Date parsing**: Both Excel serial number dates and string dates ("Jan 2025", "2025-01") are handled.
- **Money parsing**: Currency symbols ($) and commas are stripped before parsing.
- **Deduplication**: Accounts are deduplicated by alias (first occurrence wins). Financials use the composite unique index `[accountId, reportingMonth, binType, acquirerId]`.
- **Unknown references**: `salesRepId` and `accountId` are stored as raw strings during ingestion. A post-processing step (not yet implemented) resolves them to database IDs.

---

## Re-run Behaviour (Upsert Logic)

When connected to Prisma, all mappers should use `upsert` (not `create`) so that re-running the ingestion with updated data is safe and idempotent:

```ts
// Example upsert pattern for FinancialActual
await prisma.financialActual.upsert({
  where: {
    accountId_reportingMonth_binType_acquirerId: {
      accountId:      record.accountId,
      reportingMonth: record.reportingMonth,
      binType:        record.binType,
      acquirerId:     record.acquirerId,
    },
  },
  update: record,
  create: record,
});
```

This ensures that:
- Re-running after correcting source data updates existing records
- New records from subsequent months are inserted cleanly
- Duplicate rows are not created
