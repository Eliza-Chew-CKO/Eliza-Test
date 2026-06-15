// Maps "NORAM Users - AW" sheet rows → User records
// Expected columns: Name, Email, Role, Sales Region

interface UserRow {
  Name: string;
  Email: string;
  Role: string;
  'Sales Region'?: string;
}

const ROLE_MAP: Record<string, string> = {
  'Sales Rep': 'SALES_REP',
  'Account Manager': 'ACCOUNT_MANAGER',
  'Revenue Ops': 'REVENUE_OPS',
  'Executive': 'EXECUTIVE',
};

export async function mapUsers(rows: UserRow[], prisma: any) {
  for (const row of rows) {
    await prisma.user.upsert({
      where: { email: row.Email.toLowerCase().trim() },
      create: {
        name: row.Name.trim(),
        email: row.Email.toLowerCase().trim(),
        role: ROLE_MAP[row.Role] ?? 'SALES_REP',
        salesRegion: row['Sales Region'] ?? null,
      },
      update: {
        name: row.Name.trim(),
        role: ROLE_MAP[row.Role] ?? 'SALES_REP',
        salesRegion: row['Sales Region'] ?? null,
      },
    });
  }
  console.log(`Upserted ${rows.length} users.`);
}
