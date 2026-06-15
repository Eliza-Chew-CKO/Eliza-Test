// Maps "Targets" sheet → Target records
// Expected columns: Period (YYYY-MM), Type, Amount, GoLiveCount

import { prisma } from '../../packages/db/src';

interface TargetRow {
  Period: string;       // e.g. "2026-01"
  Type: string;         // e.g. "FRONTBOOK_BASE"
  Amount: number;
  GoLiveCount?: number;
}

export async function mapTargets(rows: TargetRow[]) {
  for (const row of rows) {
    const period = new Date(`${row.Period}-01`);

    await prisma.target.upsert({
      where: { period_type: { period, type: row.Type as any } },
      create: {
        period,
        type: row.Type as any,
        amount: row.Amount,
        goLiveCount: row.GoLiveCount ?? null,
      },
      update: {
        amount: row.Amount,
        goLiveCount: row.GoLiveCount ?? null,
      },
    });
  }

  console.log(`Upserted ${rows.length} targets.`);
}
