/**
 * vampService.ts
 *
 * VAMP (Visa Acquirer Monitoring Programme) data access layer.
 *
 * VAMP ratio = fraudEvents / totalCapturedEvents
 * Accounts exceeding Visa's threshold (typically 0.009 for fraud, 0.005 for TC40)
 * are flagged as "Excessive VAMP" and may face fines from the acquirer.
 *
 * When Prisma is connected, these functions query the VampRecord table.
 *
 * Current state: returns typed mock data.
 */

import type { DashboardFilters } from '../middleware/filters';

export interface VampRecordData {
  id: string;
  accountId: string;
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
  totalAccounts: number;
  excessiveVampAccounts: number;
  avgVampRatio: number;
  totalFraudEvents: number;
  totalCapturedEvents: number;
  byAcquirer: Array<{
    acquirerId: string;
    avgRatio: number;
    accountCount: number;
  }>;
  byVampType: Array<{
    vampType: string;
    count: number;
    avgRatio: number;
  }>;
}

interface VampFilters extends Partial<DashboardFilters> {
  accountId?: string;
  acquirerId?: string;
}

const EXCESSIVE_THRESHOLD = 0.009; // Visa standard fraud VAMP threshold

function generateMockVampRecords(): VampRecordData[] {
  return Array.from({ length: 15 }, (_, i) => {
    const captured = 10_000 + i * 2_000;
    const fraud    = Math.floor(captured * (0.001 + i * 0.0008));
    return {
      id:                  `vamp-${i + 1}`,
      accountId:           `acct-${i + 1}`,
      reportingMonth:      '2025-06-01T00:00:00Z',
      createdEvents:       Math.floor(captured * 1.1),
      fraudEvents:         fraud,
      totalCapturedEvents: captured,
      vampRatio:           fraud / captured,
      vampType:            i % 2 === 0 ? 'Fraud' : 'TC40',
      vampAssessment:      fraud / captured > EXCESSIVE_THRESHOLD ? 'Excessive' : 'Normal',
      acquirerCountry:     i % 3 === 0 ? 'US' : 'CA',
      acquirerId:          `ACQ-${String(i % 4 + 1).padStart(3, '0')}`,
      createdAt:           '2025-07-01T00:00:00Z',
    };
  });
}

/**
 * getVampRecords
 *
 * TODO: Replace mock with Prisma query:
 *
 *   prisma.vampRecord.findMany({
 *     where: {
 *       reportingMonth: buildDateFilter(filters),
 *       accountId:      filters.accountId  ? { equals: filters.accountId } : undefined,
 *       acquirerId:     filters.acquirerId ? { equals: filters.acquirerId } : undefined,
 *       account: {
 *         salesRepId: filters.repId ? { equals: filters.repId } : undefined,
 *         tier:       filters.tier  ? { equals: filters.tier  } : undefined,
 *       },
 *     },
 *     include: { account: true },
 *     orderBy: { vampRatio: 'desc' },
 *   })
 *
 * Threshold logic: flag records where vampRatio > 0.009 (fraud) or > 0.005 (TC40).
 */
export async function getVampRecords(filters: VampFilters): Promise<VampRecordData[]> {
  let records = generateMockVampRecords();

  if (filters.accountId)  records = records.filter((r) => r.accountId  === filters.accountId);
  if (filters.acquirerId) records = records.filter((r) => r.acquirerId === filters.acquirerId);

  return records;
}

/**
 * getVampSummary
 *
 * Aggregates VAMP metrics across all accounts for the current month.
 *
 * TODO: Replace with Prisma aggregate queries:
 *
 *   prisma.vampRecord.aggregate({
 *     _avg:  { vampRatio: true },
 *     _sum:  { fraudEvents: true, totalCapturedEvents: true },
 *     _count: { id: true },
 *     where: { reportingMonth: currentMonthFilter },
 *   })
 *
 *   // Group by acquirerId
 *   prisma.vampRecord.groupBy({
 *     by: ['acquirerId'],
 *     _avg: { vampRatio: true },
 *     _count: { id: true },
 *   })
 *
 *   // Group by vampType
 *   prisma.vampRecord.groupBy({
 *     by: ['vampType'],
 *     _avg: { vampRatio: true },
 *     _count: { id: true },
 *   })
 */
export async function getVampSummary(): Promise<VampSummary> {
  const records = await getVampRecords({});

  const totalFraud    = records.reduce((s, r) => s + r.fraudEvents,         0);
  const totalCaptured = records.reduce((s, r) => s + r.totalCapturedEvents, 0);
  const avgRatio      = records.length
    ? records.reduce((s, r) => s + r.vampRatio, 0) / records.length
    : 0;

  // Group by acquirer
  const acquirerMap = new Map<string, { ratioSum: number; count: number }>();
  for (const r of records) {
    if (!r.acquirerId) continue;
    const entry = acquirerMap.get(r.acquirerId) ?? { ratioSum: 0, count: 0 };
    entry.ratioSum += r.vampRatio;
    entry.count    += 1;
    acquirerMap.set(r.acquirerId, entry);
  }

  // Group by vampType
  const typeMap = new Map<string, { ratioSum: number; count: number }>();
  for (const r of records) {
    const entry = typeMap.get(r.vampType) ?? { ratioSum: 0, count: 0 };
    entry.ratioSum += r.vampRatio;
    entry.count    += 1;
    typeMap.set(r.vampType, entry);
  }

  return {
    totalAccounts:         records.length,
    excessiveVampAccounts: records.filter((r) => r.vampRatio > EXCESSIVE_THRESHOLD).length,
    avgVampRatio:          avgRatio,
    totalFraudEvents:      totalFraud,
    totalCapturedEvents:   totalCaptured,
    byAcquirer: Array.from(acquirerMap.entries()).map(([acquirerId, v]) => ({
      acquirerId,
      avgRatio: v.ratioSum / v.count,
      accountCount: v.count,
    })),
    byVampType: Array.from(typeMap.entries()).map(([vampType, v]) => ({
      vampType,
      count:    v.count,
      avgRatio: v.ratioSum / v.count,
    })),
  };
}
