# NORAM Full Business Dashboard

Internal web application replacing the Google Sheets/Coefficient prototype for tracking the North American sales pipeline, revenue actuals vs. targets, and existing client performance.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts, TanStack Table |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Data Ingestion | Custom xlsx/csv parser scripts |

## Project Structure

```
noram-dashboard/
├── apps/
│   ├── web/          # Next.js 14 frontend
│   └── api/          # Express REST API
├── packages/
│   └── db/           # Prisma schema & client
└── scripts/
    └── ingest/       # Data ingestion from xlsx exports
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- pnpm (recommended)

### Setup

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
# Edit .env with your DATABASE_URL

# Run database migrations
cd packages/db && npx prisma migrate dev

# Start development servers
pnpm dev
```

## Dashboard Sections

1. **Executive Summary** — KPI Hero Cards (Total MR, Frontbook MR, Backbook MR, US BIN TPV, Run Rates)
2. **Financial Trends** — Cumulative monthly line charts, roll vs base gap table
3. **Frontbook & Pipeline** — Goal-to-live tracker, closed/won table, pipeline funnel, weighted pipeline
4. **Backbook & Account Management** — Managed/unmanaged client tables, VAMP risk metrics
5. **Leaderboards** — Rep MR ranking, activity top-10s by pipeline stage

## Data Ingestion

Export Google Sheet tabs as `.xlsx` or `.csv` and run:

```bash
npx ts-node scripts/ingest/parseExcel.ts --file ./data/noram-export.xlsx
```

Sheet tabs mapped:
- `NORAM Users - AW` → Users table
- `Data` → Accounts + FinancialActuals tables
- `BIN TPV - AW` → FinancialActuals (TPV records)
- `Targets` → Targets table
- `Excessive VAMP` → VampRecords table
- `Salesforce Opportunity Snapshot` → Opportunities table
