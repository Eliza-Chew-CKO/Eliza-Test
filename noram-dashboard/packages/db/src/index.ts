/**
 * packages/db/src/index.ts
 *
 * Exports a singleton PrismaClient instance that is safe to use in:
 *   - Next.js (hot reload creates multiple module instances in dev)
 *   - Express API (single long-lived process)
 *
 * The global pattern ensures that the Prisma Client is reused across
 * hot reloads in development, preventing "too many connections" errors.
 */

import { PrismaClient } from '@prisma/client';

// Extend the Node.js global type to hold the Prisma singleton
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
}

export const prisma: PrismaClient =
  global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Re-export all generated Prisma types so consumers can import from @noram/db
export * from '@prisma/client';

export default prisma;
