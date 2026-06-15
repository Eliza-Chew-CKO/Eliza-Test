import { Prisma } from '@prisma/client';
import { prisma } from '../../../packages/db/src';
import { DashboardFilters, lastCompletedMonthStart, subMonths } from '../middleware/filters';

const SOLIDGATE_FILTER = { NOT: { referralPartner: { contains: 'SOLIDGATE', mode: Prisma.QueryMode.insensitive } } };

// ─── Account-level backbook performance ───────────────────────────────────────

export interface BackbookClientRow {
  alias: string;
  accountName: string | null;
  tier: string | null;
  rating: string | null;
  accountManager: string | null;
  salesRep: string | null;
  qtdMR: number;
  mrYTD: number;
  mrLastMonth: number;
  mrYoYPct: number | null;
  tpvYTD: number;
  tpvLastMonth: number;
  pctToTarget: number | null;
}

async function fetchBackbookAccounts(
  filters: DashboardFilters,
  isManaged: boolean,
): Promise<BackbookClientRow[]> {
  const { startDate, endDate, tier, repName } = filters;
  const now = new Date();

  // QTD start = first day of current quarter
  const qMonth = Math.floor(now.getUTCMonth() / 3) * 3;
  const qtdStart = new Date(Date.UTC(now.getUTCFullYear(), qMonth, 1));

  // Last completed month
  const lcmStart = lastCompletedMonthStart();
  const lcmEnd   = new Date(Date.UTC(lcmStart.getUTCFullYear(), lcmStart.getUTCMonth() + 1, 0));

  // Same YTD period last year
  const yoyStart = new Date(Date.UTC(startDate.getUTCFullYear() - 1, 0, 1));
  const yoyEnd   = new Date(Date.UTC(startDate.getUTCFullYear() - 1, endDate.getUTCMonth(), endDate.getUTCDate()));

  const accountWhere: Prisma.AccountWhereInput = {
    isManaged,
    ...SOLIDGATE_FILTER,
    goLiveDate: { lt: new Date('2026-01-01') },
    ...(tier ? { tier: tier as any } : {}),
    ...(repName ? { salesRep: { fullName: { contains: repName, mode: 'insensitive' } } } : {}),
  };

  const accounts = await prisma.account.findMany({
    where: accountWhere,
    include: {
      salesRep: { select: { fullName: true } },
      accountManager: { select: { fullName: true } },
    },
    orderBy: { alias: 'asc' },
  });

  const results: BackbookClientRow[] = [];

  for (const account of accounts) {
    const [ytdAgg, qtdAgg, lcmAgg, yoyAgg] = await Promise.all([
      prisma.financialActual.aggregate({
        where: { accountId: account.id, bookType: 'BACKBOOK', reportingMonth: { gte: startDate, lte: endDate } },
        _sum: { totalFeeIncGrossFX: true, tpvAmount: true },
      }),
      prisma.financialActual.aggregate({
        where: { accountId: account.id, bookType: 'BACKBOOK', reportingMonth: { gte: qtdStart, lte: endDate } },
        _sum: { totalFeeIncGrossFX: true },
      }),
      prisma.financialActual.aggregate({
        where: { accountId: account.id, bookType: 'BACKBOOK', reportingMonth: { gte: lcmStart, lte: lcmEnd } },
        _sum: { totalFeeIncGrossFX: true, tpvAmount: true },
      }),
      prisma.financialActual.aggregate({
        where: { accountId: account.id, bookType: 'BACKBOOK', reportingMonth: { gte: yoyStart, lte: yoyEnd } },
        _sum: { totalFeeIncGrossFX: true },
      }),
    ]);

    const mrYTD = Number(ytdAgg._sum.totalFeeIncGrossFX ?? 0);
    const mrYoY = Number(yoyAgg._sum.totalFeeIncGrossFX ?? 0);
    if (mrYTD === 0) continue; // skip inactive accounts

    // Per-account AM target for pctToTarget
    const amTarget = await prisma.aMTarget.findFirst({
      where: { accountId: account.id },
      orderBy: { quarter: 'desc' },
    });

    results.push({
      alias: account.alias,
      accountName: account.accountName,
      tier: account.tier,
      rating: account.rating,
      accountManager: account.accountManager?.fullName ?? null,
      salesRep: account.salesRep?.fullName ?? null,
      qtdMR: Number(qtdAgg._sum.totalFeeIncGrossFX ?? 0),
      mrYTD,
      mrLastMonth: Number(lcmAgg._sum.totalFeeIncGrossFX ?? 0),
      mrYoYPct: mrYoY > 0 ? mrYTD / mrYoY - 1 : null,
      tpvYTD: Number(ytdAgg._sum.tpvAmount ?? 0),
      tpvLastMonth: Number(lcmAgg._sum.tpvAmount ?? 0),
      pctToTarget: amTarget?.revenueTarget ? mrYTD / Number(amTarget.revenueTarget) - 1 : null,
    });
  }

  // Sort by mrYTD descending
  return results.sort((a, b) => b.mrYTD - a.mrYTD);
}

export const getManagedAccounts   = (f: DashboardFilters) => fetchBackbookAccounts(f, true);
export const getUnmanagedAccounts = (f: DashboardFilters) => fetchBackbookAccounts(f, false);

// ─── Excessive VAMP ───────────────────────────────────────────────────────────

export interface ExcessiveVampRow {
  alias: string;
  owner: string | null;
  domain: string | null;
  acquirer: string | null;
  vampAssessment: number;
  vampRatio: number;
  createdEvents: number;
  fraudEvents: number;
}

export async function getExcessiveVamp(_filters: DashboardFilters): Promise<ExcessiveVampRow[]> {
  // Return records flagged from the "4. Excessive VAMP" curated sheet
  const records = await prisma.vampRecord.findMany({
    where: {
      OR: [
        { isExcessiveFlag: true },
        // Also catch records calculated as excessive: ratio > 0.015 AND fraudEvents > 1500
        { vampRatio: { gt: 0.015 }, fraudEvents: { gt: 1500 } },
      ],
    },
    orderBy: { vampAssessment: 'desc' },
    distinct: ['alias'],
  });

  return records.map(r => ({
    alias: r.alias,
    owner: r.excessiveOwner ?? r.salesRepName,
    domain: r.websiteDomain ?? r.excessiveAcquirer,
    acquirer: r.excessiveAcquirer ?? r.globalAcquirerId,
    // PRD: assessment = (createdEvents + fraudEvents) * 8
    vampAssessment: r.isExcessiveFlag && r.vampAssessment
      ? Number(r.vampAssessment)
      : (r.createdEvents + r.fraudEvents) * 8,
    vampRatio: Number(r.vampRatio),
    createdEvents: r.createdEvents,
    fraudEvents: r.fraudEvents,
  }));
}

// ─── VAMP trend (monthly ratio) ───────────────────────────────────────────────

export interface VampMonthPoint {
  month: string;
  isoMonth: string;
  avgRatio: number;
  totalCreated: number;
  totalFraud: number;
  totalCaptured: number;
}

export async function getVampTrend(filters: DashboardFilters): Promise<VampMonthPoint[]> {
  const records = await prisma.vampRecord.groupBy({
    by: ['reportingMonth'],
    where: {
      isExcessiveFlag: false, // use full VAMP flags data, not just excessive sheet
      reportingMonth: { gte: filters.startDate, lte: filters.endDate },
    },
    _avg: { vampRatio: true },
    _sum: { createdEvents: true, fraudEvents: true, capturedEvents: true },
    orderBy: { reportingMonth: 'asc' },
  });

  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return records.map(r => {
    const d = new Date(r.reportingMonth);
    const m = d.getUTCMonth();
    const isoMonth = `${d.getUTCFullYear()}-${String(m + 1).padStart(2, '0')}`;
    return {
      month: `${MONTH_LABELS[m]} ${String(d.getUTCFullYear()).slice(2)}`,
      isoMonth,
      avgRatio: Number(r._avg.vampRatio ?? 0),
      totalCreated: r._sum.createdEvents ?? 0,
      totalFraud: r._sum.fraudEvents ?? 0,
      totalCaptured: r._sum.capturedEvents ?? 0,
    };
  });
}
