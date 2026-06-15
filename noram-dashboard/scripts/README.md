# Ingest Scripts

This directory contains TypeScript scripts for ingesting data from the NORAM
source Excel workbook into PostgreSQL via Prisma.

---

## How to Run

```bash
# From the repo root
npx ts-node scripts/ingest/parseExcel.ts --file path/to/noram-data.xlsx
```

This will:
1. Read the Excel file.
2. Parse each sheet through its mapper.
3. Upsert all records into the database (TODO: wire up Prisma calls).

**Prerequisites:**
- Database running and `DATABASE_URL` set in `.env`.
- `npx prisma migrate dev` has been run at least once.
- `npm install` done at root.

---

## Script Overview

| Script | Purpose |
|--------|---------|
| `parseExcel.ts` | Entry point — reads workbook, dispatches to mappers, upserts |
| `mapUsers.ts`   | "NORAM Users - AW" → User records |
| `mapAccounts.ts`| "Data" → Account records (deduped by alias) |
| `mapOpportunities.ts` | "Salesforce Opportunity Snapshot" → Opportunity records |
| `mapFinancials.ts` | "Data" + "BIN TPV - AW" → FinancialActual records |
| `mapTargets.ts` | "Targets" → Target records |
| `mapVAMP.ts`    | "Excessive VAMP" → VampRecord records |

---

## Expected Excel Sheet Structure

### Sheet 1: "NORAM Users - AW"
Sales reps and account managers.

| Column | Description |
|--------|-------------|
| Name | Full name |
| Email | Work email (unique key) |
| Role | AE / AM / Manager |
| Sales Region | US-East / US-West / US-Central / Canada |

### Sheet 2: "Data"
Monthly revenue and fee data per account.

| Column | Description |
|--------|-------------|
| Account | Account alias (unique per account) |
| Reporting Month | Month the data covers (e.g. "Jun-25") |
| Total Fees | Gross total fees |
| Gross FX | FX revenue component |
| CCP Exclusion | Chargeback/exclusion amount |
| Net Revenue | Computed: Total Fees − Gross FX − CCP Exclusion |
| TPV Amount | Total processed volume |
| Managed (Y/N) | Whether account is managed |
| Tier | Enterprise / Mid-Market / SMB |
| Region | Geographic region |
| Sales Rep | Rep name (matched to User.email) |
| Account Manager | AM name (optional) |
| Go-Live Date | Date account went live |
| Referral Partner | Referring partner (optional) |
| Sector | Industry vertical (optional) |

### Sheet 3: "BIN TPV - AW"
TPV broken down by BIN type and acquirer.

| Column | Description |
|--------|-------------|
| Account | Account alias |
| Reporting Month | Month |
| BIN Type | BIN category code |
| Acquirer ID | Acquirer identifier |
| TPV Amount | Volume for this BIN/acquirer combination |
| Net Revenue | Revenue attributed to this combination |

### Sheet 4: "Targets"
Monthly performance targets.

| Column | Description |
|--------|-------------|
| Period | "YYYY-MM" or "Mon-YY" |
| Type | Frontbook Base / Frontbook Roll / Backbook Managed / Backbook Unmanaged / TPV |
| Amount | Target amount (USD) |
| Go-Live Count | Expected go-live count (FRONTBOOK_BASE only) |

### Sheet 5: "Excessive VAMP"
VAMP fraud monitoring records.

| Column | Description |
|--------|-------------|
| Account | Account alias |
| Reporting Month | Month |
| Created Events | Authorised transaction count |
| Fraud Events | Fraud-confirmed transaction count |
| Total Captured Events | Total captured count |
| VAMP Ratio | Pre-computed ratio (or computed if absent) |
| VAMP Type | VISA_VAMP / MC_MATCH / etc. |
| Assessment | Excessive / At Risk / Healthy |
| Acquirer Country | ISO country code |
| Acquirer ID | Acquirer identifier |

### Sheet 6: "Salesforce Opportunity Snapshot"
CRM pipeline data exported from Salesforce.

| Column | Description |
|--------|-------------|
| Account Name | Account alias |
| Stage | Salesforce stage (normalised to dashboard stages) |
| Type | New Business / Existing Business |
| Amount | Base monthly revenue |
| Roll Amount | Ramp/roll MNR |
| Weighted Amount | Pre-weighted MNR (optional) |
| Close Date | Expected close date |
| Go-Live Date | Expected go-live date |
| Forecast Category | Commit / Best Case / Pipeline |
| Owner | Primary rep name |
| Second Owner | Co-owner rep name (optional) |

---

## Data Validation Notes

- **Missing emails** in the Users sheet cause that row to be skipped.
- **Missing close dates** in Opportunities cause that row to be skipped.
- **Unknown target types** log a warning and skip the row.
- **VAMP ratios** are computed from `fraudEvents / totalCapturedEvents` when the
  pre-computed column is absent or zero.
- **Account tiers** are inferred from revenue thresholds when the Tier column
  is blank: ≥ $50k → Enterprise, ≥ $10k → Mid-Market, else SMB.

---

## Re-runs and Upsert Logic

The ingest pipeline is designed to be **idempotent** — safe to run multiple
times against the same (or updated) file.

Each model uses a unique constraint as the upsert key:

| Model | Upsert key |
|-------|-----------|
| User | `email` |
| Account | `alias` |
| Opportunity | Salesforce ID (if available) or `accountId + closeDate + type` |
| FinancialActual | `accountId + reportingMonth + binType + acquirerId` |
| Target | `period + type` |
| VampRecord | `accountId + reportingMonth + acquirerId` |

Prisma upsert example:
```ts
await prisma.target.upsert({
  where: { period_type: { period: t.period, type: t.type } },
  update: { amount: t.amount, goLiveCount: t.goLiveCount },
  create: t,
});
```
