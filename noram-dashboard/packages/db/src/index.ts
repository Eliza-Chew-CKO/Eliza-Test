import { PrismaClient } from '@prisma/client';

/**
 * PrismaClient Singleton
 *
 * Next.js hot reloading in development creates new module instances on each
 * refresh, which would exhaust the PostgreSQL connection pool if we created
 * a new PrismaClient each time. The global pattern below prevents that by
 * storing the client on globalThis between hot reloads.
 *
 * In production, Node.js caches modules normally, so this is a no-op.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export all Prisma types so consumers can import from @noram/db
// instead of needing to depend directly on @prisma/client.
export * from '@prisma/client';
