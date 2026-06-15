# NORAM Sales Dashboard

A full-stack internal sales dashboard for the NORAM team, providing real-time visibility into revenue performance, frontbook pipeline, backbook accounts, VAMP ratios, and rep leaderboards.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Charts | Recharts 2 |
| Tables | @tanstack/react-table 8 |
| Backend | Express 4, TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL 15 |
| Monorepo | npm Workspaces |

## Folder Structure

```
noram-dashboard/
├── apps/
│   ├── web/                   # Next.js 14 frontend (App Router)
│   │   └── src/
│   │       ├── app/           # Next.js app directory (pages, layouts)
│   │       ├── components/    # UI components (charts, tables, sections, layout)
│   │       ├── lib/           # API client, utility functions
│   │       └── types/         # Shared TypeScript interfaces
│   └── api/                   # Express REST API backend
│       └── src/
│           ├── routes/        # Route handlers (kpi, pipeline, backbook, leaderboard, targets)
│           ├── services/      # Business logic (revenue, pipeline, backbook, vamp)
│           └── middleware/    # Request parsing/validation middleware
├── packages/
│   └── db/                    # Prisma schema & client singleton
│       ├── prisma/
│       │   └── schema.prisma  # Full database schema
│       └── src/
│           └── index.ts       # PrismaClient singleton export
└── scripts/
    └── ingest/                # Excel data ingestion scripts
        ├── parseExcel.ts      # Workbook parser & dispatcher
        ├── mapUsers.ts        # NORAM Users sheet mapper
        ├── mapAccounts.ts     # Account data mapper
        ├── mapOpportunities.ts# Salesforce Opportunity snapshot mapper
        ├── mapFinancials.ts   # Data & BIN TPV sheet mapper
        ├── mapTargets.ts      # Targets sheet mapper
        └── mapVAMP.ts         # Excessive VAMP sheet mapper
```

## Prerequisites

- Node.js 18+
- PostgreSQL 15 running locally (or connection string to a hosted instance)
- npm 9+

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repo-url>
cd noram-dashboard
```

### 2. Install dependencies

```bash
npm install
```

This installs dependencies for all workspaces (`apps/web`, `apps/api`, `packages/db`) via npm workspaces.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values (see [Environment Variables](#environment-variables) below).

For the frontend, also copy the web-specific env:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

### 4. Run database migrations

```bash
npm run db:migrate
```

This runs `prisma migrate dev` from the `packages/db` workspace, applying all schema migrations and generating the Prisma client.

### 5. Start the development servers

```bash
npm run dev
```

This starts both `apps/web` (Next.js on port 3000) and `apps/api` (Express on port 4000) concurrently.

- Frontend: http://localhost:3000
- API: http://localhost:4000
- Prisma Studio: `npm run db:studio`

### 6. (Optional) Ingest Excel data

```bash
npx ts-node scripts/ingest/parseExcel.ts --file path/to/noram-data.xlsx
```

See [scripts/README.md](scripts/README.md) for full ingest documentation.

## Environment Variables

### Root `.env` (used by API and Prisma)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/noram_dashboard` |
| `PORT` | API server port (optional, defaults to 4000) | `4000` |
| `NODE_ENV` | Runtime environment | `development` |

### `apps/web/.env.local` (Next.js frontend)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Base URL for the Express API | `http://localhost:4000` |

## Available Scripts

Run from the **repo root**:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all apps for production |
| `npm run lint` | Lint all workspaces |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:generate` | Re-generate Prisma client |
| `npm run db:studio` | Open Prisma Studio GUI |

## Architecture Notes

- The frontend (`apps/web`) communicates exclusively with the Express API (`apps/api`) via REST. In local dev, Next.js rewrites `/api/*` to `localhost:4000` so CORS is not an issue.
- The Express API uses Prisma (`packages/db`) to query PostgreSQL.
- The Prisma client is a singleton exported from `packages/db/src/index.ts` to avoid connection pool exhaustion during Next.js hot reloads.
- Ingestion scripts in `scripts/ingest/` parse the source Excel workbook and upsert records into the database using Prisma's `upsert` with appropriate unique constraints.
