// Maps "NORAM Users - AW" sheet rows → User records
// Expected columns: Name, Email, Role, Sales Region

import { prisma } from '../../packages/db/src';

interface UserRow {
  Name: string;
  Email: string;
  Role: string;
  'Sales Region'?: string;
}

export async function mapUsers(rows: UserRow[]) {
  const roleMap: Record<string, string> = {
    'Sales Rep': 'SALES_REP',
    'Account Manager': 'ACCOUNT_MANAGER',
    'Revenue Ops': 'REVENUE_OPS',
    'Executive': 'EXECUTIVE',
  };

  for (const row of rows) {
    await prisma.user.upsert({
      where: { email: row.Email.toLowerCase().trim() },
      create: {
        name: row.Name.trim(),
        email: row.Email.toLowerCase().trim(),
        role: (roleMap[row.Role] ?? 'SALES_REP') as any,
        salesRegion: row['Sales Region'] ?? null,
      },
      update: {
        name: row.Name.trim(),
        role: (roleMap[row.Role] ?? 'SALES_REP') as any,
        salesRegion: row['Sales Region'] ?? null,
      },
    });
  }

  console.log(`Upserted ${rows.length} users.`);
}
