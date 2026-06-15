/**
 * vampService.ts
 *
 * Handles VAMP (Visa Acquirer Monitoring Programme) record queries and ratio calculations.
 *
 * VAMP Ratio definition:
 *   vampRatio = fraudEvents / totalCapturedEvents
 *
 * Threshold logic (indicative thresholds — confirm with compliance team):
 *   < 0.005  (0.5%)  → NORMAL   — within acceptable range
 *   0.005–0.009      → ELEVATED — requires monitoring
 *   > 0.009  (0.9%)  → EXCESSIVE — triggers acquirer reporting obligations
 *
 * Key Prisma queries:
 *
 * getVampRecords:
 *   prisma.vampRecord.findMany({
 *     where: {
 *       reportingMonth: periodStart,
 *       ...(filters.acquirerId ? { acquirerId: filters.acquirerId } : {}),
 *       ...(filters.accountId ? { accountId: filters.accountId } : {}),
 *     },
 *     include: {
 *       account: { select: { alias: true, tier: true, salesRepId: true } },
 *     },
 *     orderBy: { vampRatio: 'desc' },
 *   });
 *
 * getVampSummary:
 *   prisma.vampRecord.aggregate({
 *     _avg: { vampRatio: true },
 *     _count: { id: true },
 *     where: { reportingMonth: periodStart },
 *   });
 *   Plus a groupBy acquirerId breakdown.
 */

export interface VampFilters {
  reportingMonth?: string;
  acquirerId?: string;
  accountId?: string;
}

export interface VampRecord {
  id: string;
  accountId: string;
  accountAlias: string;
  reportingMonth: string;
  createdEvents: number;
  fraudEvents: number;
  totalCapturedEvents: number;
  vampRatio: number;
  vampType: string;
  vampAssessment: string | null;
  acquirerCountry: string | null;
  acquirerId: string | null;
  createdAt: string;
}

export interface VampSummary {
  averageVampRatio: number;
  excessiveCount: number;
  elevatedCount: number;
  normalCount: number;
  acquirerBreakdown: { acquirerId: string; averageVampRatio: number; count: number }[];
}

/**
 * Classifies a VAMP ratio into a tier string.
 */
export function classifyVampRatio(ratio: number): 'NORMAL' | 'ELEVATED' | 'EXCESSIVE' {
  if (ratio > 0.009) return 'EXCESSIVE';
  if (ratio > 0.005) return 'ELEVATED';
  return 'NORMAL';
}

/**
 * Returns VAMP records for the specified filters.
 */
export async function getVampRecords(_filters: VampFilters): Promise<VampRecord[]> {
  // TODO: replace with real Prisma findMany (see JSDoc above)
  return [
    {
      id: 'vamp_001',
      accountId: 'acc_002',
      accountAlias: 'QuickShop',
      reportingMonth: '2025-06-01T00:00:00Z',
      createdEvents: 85_000,
      fraudEvents: 952,
      totalCapturedEvents: 85_000,
      vampRatio: 0.0112,
      vampType: 'DOMESTIC',
      vampAssessment: 'Under review',
      acquirerCountry: 'US',
      acquirerId: 'ACQ_VISA_US',
      createdAt: '2025-06-10T00:00:00Z',
    },
    {
      id: 'vamp_002',
      accountId: 'acc_001',
      accountAlias: 'ACME Payments',
      reportingMonth: '2025-06-01T00:00:00Z',
      createdEvents: 420_000,
      fraudEvents: 1_890,
      totalCapturedEvents: 420_000,
      vampRatio: 0.0045,
      vampType: 'INTERNATIONAL',
      vampAssessment: null,
      acquirerCountry: 'US',
      acquirerId: 'ACQ_VISA_US',
      createdAt: '2025-06-10T00:00:00Z',
    },
  ];
}

/**
 * Returns an aggregate VAMP summary including averages and acquirer breakdown.
 */
export async function getVampSummary(): Promise<VampSummary> {
  // TODO: replace with real Prisma aggregate + groupBy queries (see JSDoc above)
  return {
    averageVampRatio: 0.0072,
    excessiveCount: 3,
    elevatedCount: 7,
    normalCount: 42,
    acquirerBreakdown: [
      { acquirerId: 'ACQ_VISA_US', averageVampRatio: 0.0068, count: 28 },
      { acquirerId: 'ACQ_MC_US',   averageVampRatio: 0.0081, count: 14 },
      { acquirerId: 'ACQ_VISA_CA', averageVampRatio: 0.0059, count: 10 },
    ],
  };
}
