# Data Ingestion Scripts

These scripts parse exported `.xlsx` workbooks from the source data files and load the data into the PostgreSQL database via Prisma.

---

## Prerequisites

Install the xlsx parsing library:

```bash
npm install xlsx @types/xlsx
```

Ensure your `.env` file has a valid `DATABASE_URL` and that you have run `prisma migrate dev` to create the database schema.

---

## Running the Ingest

### Dry run (preview row counts without writing to DB)

```bash
npx ts-node scripts/ingest/parseExcel.ts --file=path/to/NORAM_Data.xlsx --dry-run
```

### Full ingest

```bash
npx ts-node scripts/ingest/parseExcel.ts --file=path/to/NORAM_Data.xlsx
```

The ingest processes sheets in dependency order:

```
1. NORAM Users - AW          → User table
2. Data                      → Account table (aliases)
3. Data                      → FinancialActual table
4. BIN TPV - AW              → FinancialActual table (TPV rows by BIN type)
5. Targets                   → Target table
6. Salesforce Opportunity Snapshot → Opportunity table
7. Excessive VAMP            → VampRecord table
```

---

## Script Reference

| Script | Purpose |
|--------|---------|
| `parseExcel.ts` | Main entry point. Reads the workbook, dispatches each sheet to the appropriate mapper, runs in dependency order. |
| `mapUsers.ts` | Maps "NORAM Users - AW" → `User` table. Run first — other tables reference user IDs. |
| `mapAccounts.ts` | Maps unique account aliases from the "Data" sheet → `Account` table. |
| `mapOpportunities.ts` | Maps "Salesforce Opportunity Snapshot" → `Opportunity` table. Normalises stage names and deal types. |
| `mapFinancials.ts` | Maps "Data" and "BIN TPV - AW" sheets → `FinancialActual` table. Handles both sheet formats. |
| `mapTargets.ts` | Maps "Targets" sheet → `Target` table. Parses period strings and target type enums. |
| `mapVAMP.ts` | Maps "Excessive VAMP" sheet → `VampRecord` table. Classifies VAMP type and computes assessments. |

---

## Expected Sheet Structure

### "NORAM Users - AW"

| Column | Type | Notes |
|--------|------|-------|
| Name | string | Full name of the rep/AM |
| Email | string | Unique identifier — used for upsert |
| Role | string | e.g. "Sales Rep", "Account Manager" |
| Sales Region | string | e.g. "US-East", "Canada" |

### "Data"

| Column | Type | Notes |
|--------|------|-------|
| Alias | string | Unique account identifier (not the legal name) |
| Reporting Month | string | YYYY-MM or MM/YYYY |
| Owner | string | Rep name, matched to User.name |
| Account Manager | string | AM name, matched to User.name (optional) |
| Tier | string | "Enterprise" / "Mid-Market" / "SMB" or tier number |
| Managed | string | "Yes" / "No" |
| Region | string | e.g. "US-West" |
| Total Fees | number | Gross merchant fees |
| Gross FX | number | FX revenue component |
| CCP Exclusion | number | Exclusion adjustment |
| Net Revenue | number | Total Fees + Gross FX - CCP Exclusion |
| TPV | number | Total processed volume |

### "BIN TPV - AW"

| Column | Type | Notes |
|--------|------|-------|
| Alias | string | Account alias |
| Reporting Month | string | YYYY-MM |
| BIN Type | string | e.g. "Domestic", "International", "Credit", "Debit" |
| Acquirer ID | string | Acquirer identifier |
| TPV Amount | number | TPV for this BIN + acquirer combination |

### "Targets"

| Column | Type | Notes |
|--------|------|-------|
| Period | string | YYYY-MM |
| Type | string | FRONTBOOK_BASE / FRONTBOOK_ROLL / BACKBOOK_MANAGED / BACKBOOK_UNMANAGED / TPV |
| Amount | number | Target dollar amount |
| GoLiveCount | number | Monthly go-live count target (only for FRONTBOOK_BASE type) |

### "Excessive VAMP"

| Column | Type | Notes |
|--------|------|-------|
| Alias | string | Account alias |
| Reporting Month | string | YYYY-MM |
| Acquire | string | Acquirer ID |
| Created Events | number | Total transactions in period |
| Fraud Events | number | Fraudulent/disputed transactions |
| Total Captured Events | number | Denominator for VAMP ratio calculation |
| VAMP Ratio | number | Decimal ratio (e.g. 0.018) |
| VAMP Assessment | number | Financial assessment amount (for EXCESSIVE type) |

### "Salesforce Opportunity Snapshot"

| Column | Type | Notes |
|--------|------|-------|
| Account Alias | string | Links to Account.alias |
| Owner | string | Rep name |
| Second Owner | string | Co-owner (optional) |
| Stage | string | Salesforce stage name (normalised during ingest) |
| Type | string | "New Business" / "Expansion" / "Renewal" |
| Base MNR | number | Base monthly revenue |
| Roll MNR | number | Roll monthly revenue |
| Weighted MNR | number | Probability-weighted expected MNR |
| Close Date | string | Expected close date |
| Go Live Date | string | Expected go-live date (optional) |
| Rating | string | "Hot" / "Warm" / "Cold" |

---

## Data Validation

Each mapper script:
- Skips rows where required fields (alias, reporting month) are missing — logs a warning
- Uses upsert to avoid duplicates on re-runs (idempotent)
- Normalises casing for string enums (tier, stage, type)
- Handles multiple date formats: YYYY-MM, MM/YYYY, MM/DD/YYYY

---

## Re-runs and Upsert Logic

All mappers use `prisma.*.upsert()` with natural keys:

| Table | Upsert Key |
|-------|-----------|
| User | `email` |
| Account | `alias` |
| FinancialActual | `accountId + reportingMonth + binType` |
| Target | `period + type` |
| VampRecord | `accountId + reportingMonth + acquirerId` |

Opportunities do **not** have a unique constraint (Salesforce IDs are not currently tracked). Running the ingest twice will create duplicate opportunity rows. Add a `salesforceId String? @unique` field to the schema and update `mapOpportunities.ts` to use upsert if re-runs are needed.
