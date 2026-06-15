// Maps "Targets" sheet → Target records
// Expected columns: Period (YYYY-MM), Type, Amount, GoLiveCount

interface TargetRow {
  Period: string;
  Type: string;
  Amount: number;
  GoLiveCount?: number;
}

export async function mapTargets(rows: TargetRow[], prisma: any) {
  for (const row of rows) {
    const period = new Date(`${row.Period}-01`);
    await prisma.target.upsert({
      where: { period_type: { period, type: row.Type } },
      create: { period, type: row.Type, amount: row.Amount, goLiveCount: row.GoLiveCount ?? null },
      update: { amount: row.Amount, goLiveCount: row.GoLiveCount ?? null },
    });
  }
  console.log(`Upserted ${rows.length} targets.`);
}
