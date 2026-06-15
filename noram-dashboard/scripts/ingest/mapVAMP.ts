// Maps "Excessive VAMP" sheet → VampRecord rows
// Expected columns: Alias, Owner, Domain, Acquire, Created Events, Fraud Events,
//                   Total Captured Events, VAMP Ratio, Reporting Month (YYYY-MM)

interface VampRow {
  Alias: string;
  Acquire: string;
  'Created Events': number;
  'Fraud Events': number;
  'Total Captured Events': number;
  'VAMP Ratio': number;
  'Reporting Month': string;
}

export async function mapVAMP(rows: VampRow[], prisma: any) {
  for (const row of rows) {
    const account = await prisma.account.findUnique({ where: { alias: row.Alias } });
    if (!account) { console.warn(`Account not found: ${row.Alias}`); continue; }

    const reportingMonth = new Date(`${row['Reporting Month']}-01`);
    const vampRatio = row['VAMP Ratio'];
    // Excessive: ratio > 0.015 AND fraud events > 1500
    const vampType = vampRatio > 0.015 && row['Fraud Events'] > 1500 ? 'EXCESSIVE' : 'NORMAL';
    // Assessment: (createdEvents + fraudEvents) * 8 if Excessive
    const vampAssessment = vampType === 'EXCESSIVE'
      ? (row['Created Events'] + row['Fraud Events']) * 8
      : null;

    await prisma.vampRecord.upsert({
      where: { accountId_reportingMonth: { accountId: account.id, reportingMonth } },
      create: {
        accountId: account.id, reportingMonth,
        createdEvents: row['Created Events'], fraudEvents: row['Fraud Events'],
        totalCapturedEvents: row['Total Captured Events'],
        vampRatio, vampType, vampAssessment, acquirerId: row.Acquire,
      },
      update: {
        createdEvents: row['Created Events'], fraudEvents: row['Fraud Events'],
        totalCapturedEvents: row['Total Captured Events'],
        vampRatio, vampType, vampAssessment,
      },
    });
  }
  console.log(`Processed ${rows.length} VAMP records.`);
}
