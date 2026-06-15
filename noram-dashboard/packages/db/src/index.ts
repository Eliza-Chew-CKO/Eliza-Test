import { PrismaClient } from '@prisma/client';

// ─── Singleton PrismaClient ───────────────────────────────────────────────────
//
// Next.js hot-module replacement in development causes `new PrismaClient()` to
// be called on every module reload, quickly exhausting the database connection
// pool. We cache the instance on the Node.js global object to prevent that.
//
// In production (NODE_ENV === 'production') we always create a fresh instance,
// as the module is loaded only once.

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });
}

export const prisma: PrismaClient =
  process.env.NODE_ENV === 'production'
    ? createPrismaClient()
    : (globalThis.__prisma ??= createPrismaClient());

// ─── Re-export Prisma types for consumers ─────────────────────────────────────
//
// Consumers can import from '@noram/db' instead of '@prisma/client' directly.
// This ensures they always use the version of Prisma that this package manages.

export {
  Prisma,
  type User,
  type Account,
  type Opportunity,
  type FinancialActual,
  type Target,
  type VampRecord,
  type TargetType,
} from '@prisma/client';

export default prisma;
