# NORAM Sales Dashboard

A full-stack internal sales dashboard for the North America (NORAM) team, providing real-time visibility into revenue performance, frontbook pipeline, backbook account health, VAMP metrics, and rep leaderboards.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts |
| Backend | Express 4, TypeScript, Node.js |
| Database | PostgreSQL + Prisma ORM |
| Data Tables | @tanstack/react-table v8 |
| Monorepo | npm Workspaces |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd noram-dashboard

# 2. Install all workspace dependencies
npm install

# 3. Copy environment file and fill in your values
cp .env.example .env

# 4. Run database migrations
cd packages/db
npx prisma migrate dev --name init

# 5. Start development servers (from repo root)
npm run dev
```

The web app will be available at http://localhost:3000 and the API at http://localhost:4000.

---

## Environment Variables

Create a `.env` file at the repo root with the following variables:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/noram_dashboard"

# Public API base URL (used by the Next.js frontend)
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### Variable Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Full PostgreSQL connection string used by Prisma |
| `NEXT_PUBLIC_API_URL` | Yes | Base URL for the Express API, exposed to the browser |

---

## Folder Structure

```
noram-dashboard/
├── apps/
│   ├── web/                    # Next.js 14 frontend (App Router)
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router pages and layouts
│   │   │   ├── components/
│   │   │   │   ├── charts/     # Recharts wrapper components
│   │   │   │   ├── kpi/        # KPI card components
│   │   │   │   ├── layout/     # Sidebar, Header, GlobalFilters
│   │   │   │   ├── sections/   # Full dashboard sections (Executive, Pipeline, etc.)
│   │   │   │   └── tables/     # DataTable and LeaderboardTable
│   │   │   ├── lib/            # API client, utility functions
│   │   │   └── types/          # Shared TypeScript interfaces
│   │   ├── tailwind.config.js
│   │   └── next.config.js
│   │
│   └── api/                    # Express 4 REST API backend
│       └── src/
│           ├── index.ts         # App entry point, middleware, route mounting
│           ├── routes/          # Route handlers: kpi, pipeline, backbook, leaderboard, targets
│           ├── services/        # Business logic: revenueService, pipelineService, etc.
│           └── middleware/      # Filter parsing and validation middleware
│
├── packages/
│   └── db/                     # Shared Prisma package
│       ├── prisma/
│       │   └── schema.prisma    # Full data model: User, Account, Opportunity, FinancialActual, etc.
│       └── src/
│           └── index.ts         # PrismaClient singleton export
│
└── scripts/
    └── ingest/                 # Data ingestion scripts for Excel files
        ├── parseExcel.ts        # Workbook parser and sheet dispatcher
        ├── mapUsers.ts          # NORAM Users sheet mapper
        ├── mapAccounts.ts       # Account data mapper
        ├── mapOpportunities.ts  # Salesforce Opportunity Snapshot mapper
        ├── mapFinancials.ts     # Data + BIN TPV sheet mapper
        ├── mapTargets.ts        # Targets sheet mapper
        └── mapVAMP.ts           # Excessive VAMP sheet mapper
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start all apps in development mode concurrently |
| `npm run build` | Build all apps and packages |
| `npm run lint` | Run ESLint across all workspaces |

---

## Data Ingestion

To ingest data from the source Excel file:

```bash
cd scripts/ingest
npx ts-node parseExcel.ts --file /path/to/NORAM_Data.xlsx
```

See `scripts/README.md` for full documentation on the expected Excel structure.
