/**
 * VAMP Service
 *
 * VAMP = Visa Acquirer Monitoring Programme (or equivalent scheme-level
 * fraud monitoring programme, e.g. Mastercard MATCH).
 *
 * A VampRecord captures fraud event counts vs total captured events for a
 * given account + acquirer + reporting month. The VAMP ratio is:
 *
 *   vampRatio = fraudEvents / totalCapturedEvents
 *
 * Thresholds (indicative — confirm with compliance team):
 *   < 0.005  → HEALTHY  (green)
 *   0.005 – 0.009 → AT_RISK (amber)
 *   >= 0.01  → EXCESSIVE (red) — triggers acquirer notification
 *
 * The "vampAssessment" field on the record captures the classification at
 * ingestion time based on acquirer-specific rules in the source spreadsheet.
 */

// TODO: import { prisma } from '@noram/db';

export interface VampFilters {
  accountId?: string;
  acquirerId?: string;
  acquirerCountry?: string;
  reportingMonth?: string; // "YYYY-MM"
  dateRange?: 'MTD' | 'YTD' | 'CUSTOM';
  startDate?: string;
  endDate?: string;
}

export interface VampRecordResult {
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

/**
 * getVampRecords
 *
 * Intended Prisma query:
 *   prisma.vampRecord.findMany({
 *     where: {
 *       ...(filters.accountId       ? { accountId: filters.accountId }         : {}),
 *       ...(filters.acquirerId      ? { acquirerId: filters.acquirerId }        : {}),
 *       ...(filters.acquirerCountry ? { acquirerCountry: filters.acquirerCountry } : {}),
 *       reportingMonth: { gte: periodStart, lte: periodEnd },
 *     },
 *     include: { account: true },
 *     orderBy: { vampRatio: 'desc' },
 *   })
 */
export async function getVampRecords(
  _filters: VampFilters
): Promise<VampRecordResult[]> {
  // TODO: replace with Prisma query
  return [];
}

export interface VampSummary {
  totalRecords: number;
  healthy: number;
  atRisk: number;
  excessive: number;
  averageVampRatio: number;
  highestVampRatio: number;
  accountsWithExcessive: string[]; // account IDs
}

/**
 * getVampSummary
 *
 * Aggregates VAMP records across all accounts for a reporting period.
 *
 * Intended Prisma query (raw or computed in application layer):
 *   1. Fetch all VampRecord rows for the period.
 *   2. Classify each row: vampRatio < 0.005 → healthy, 0.005–0.01 → atRisk, >= 0.01 → excessive.
 *   3. Compute averageVampRatio = AVG(vampRatio).
 *   4. Return counts and list of accountIds with excessive classification.
 */
export async function getVampSummary(): Promise<VampSummary> {
  // TODO: replace with Prisma aggregate
  return {
    totalRecords: 45,
    healthy: 38,
    atRisk: 5,
    excessive: 2,
    averageVampRatio: 0.00289,
    highestVampRatio: 0.01450,
    accountsWithExcessive: ['acc_7', 'acc_14'],
  };
}
