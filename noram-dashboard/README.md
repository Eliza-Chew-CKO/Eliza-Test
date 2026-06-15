# NORAM Sales Dashboard

A comprehensive internal sales dashboard for the NORAM region, providing real-time visibility into frontbook pipeline, backbook account performance, financial actuals vs targets, VAMP metrics, and rep leaderboards.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, clsx, tailwind-merge |
| Charts | Recharts 2 |
| Tables | @tanstack/react-table 8 |
| Backend | Express 4, TypeScript, Node.js |
| ORM | Prisma 5 |
| Database | PostgreSQL 15 |
| HTTP Client | Axios |
| Monorepo | npm workspaces |

## Folder Structure

```
noram-dashboard/
├── apps/
│   ├── web/                  # Next.js 14 frontend (App Router)
│   │   └── src/
│   │       ├── app/          # Next.js app directory (pages, layouts, routes)
│   │       ├── components/   # UI components (layout, kpi, charts, tables, sections)
│   │       ├── lib/          # API client, utility functions
│   │       └── types/        # Shared TypeScript interfaces
│   └── api/                  # Express REST API backend
│       └── src/
│           ├── routes/       # Route handlers (kpi, pipeline, backbook, leaderboard, targets)
│           ├── services/     # Business logic services (revenue, pipeline, backbook, vamp)
│           └── middleware/   # Express middleware (filter parsing, auth, error handling)
├── packages/
│   └── db/                   # Prisma schema and client singleton
│       ├── prisma/           # schema.prisma
│       └── src/              # PrismaClient export
└── scripts/
    └── ingest/               # Data ingestion scripts for Excel source files
```

## Environment Variables

Create a `.env` file in the root (or per-app) with the following variables:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/noram_dashboard"

# API base URL (used by Next.js frontend)
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string for Prisma |
| `NEXT_PUBLIC_API_URL` | Yes | Base URL for the Express API (exposed to browser) |

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 15 running locally (or a remote connection string)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/noram-dashboard.git
cd noram-dashboard
```

### 2. Install dependencies

```bash
npm install
```

This installs all workspace dependencies across `apps/web`, `apps/api`, and `packages/db`.

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env and fill in your DATABASE_URL and NEXT_PUBLIC_API_URL
```

### 4. Run database migrations

```bash
cd packages/db
npx prisma migrate dev --name init
npx prisma generate
cd ../..
```

### 5. (Optional) Ingest data from Excel

If you have the source Excel file, run:

```bash
npx ts-node scripts/ingest/parseExcel.ts --file path/to/NORAM_Data.xlsx
```

See `scripts/README.md` for full ingest documentation.

### 6. Start development servers

```bash
npm run dev
```

This concurrently starts:
- Next.js frontend at `http://localhost:3000`
- Express API at `http://localhost:4000`

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all apps for production |
| `npm run lint` | Run ESLint across all workspaces |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |

## Dashboard Sections

1. **Executive Summary** — High-level KPI cards: Net Revenue, Frontbook MNR, Backbook Revenue, TPV, Go-Live Count, VAMP Ratio
2. **Financial Trends** — Revenue actuals vs targets over time, TPV by month
3. **Frontbook Pipeline** — Pipeline funnel by stage, open opportunities table
4. **Backbook Accounts** — Managed vs unmanaged breakdown, account-level metrics
5. **Leaderboards** — Top reps ranked by revenue and deals closed
