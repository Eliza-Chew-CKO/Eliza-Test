import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { readSheet, excelDateToJs } from './parseExcel';

// Columns present in both "NORAM Users - AM" and "Users - Sales" sheets.
// Row 0 is the Salesforce import banner; Row 1 is the real header.
interface UserRow {
  'Last Login': number | string;
  '18 Digit User ID': string;
  'Full Name': string;
  'Email': string;
  'Manager: Full Name': string;
  'Start Date': number | string;
  'Date Ramped': number | string;
  'Not Ramped': boolean | string;
  'Sales Region': string;
  'Country (text only)': string;
  'Department': string;
  'CK Department': string;
  'Title': string;
  'Country': string;
  'Seniority': string;
  'Region': string;
  'Pods'?: string; // Sales sheet only
}

function inferRole(title: string, department: string): string {
  const t = (title ?? '').toLowerCase();
  const d = (department ?? '').toLowerCase();
  if (t.includes('account manager') || t.includes('am,')) return 'ACCOUNT_MANAGER';
  if (t.includes('sales engineer') || t.includes('se,')) return 'SALES_ENGINEER';
  if (t.includes('bdr') || t.includes('business development')) return 'BDR';
  if (t.includes('manager') || t.includes('director') || t.includes('vp') || t.includes('head of')) return 'MANAGER';
  if (d.includes('revenue ops') || d.includes('revops')) return 'REVENUE_OPS';
  return 'SALES_REP';
}

export async function mapUsers(
  wb: XLSX.WorkBook,
  prisma: PrismaClient,
  dryRun = false,
) {
  const amRows = readSheet<UserRow>(wb, 'NORAM Users - AM', 1);
  const salesRows = readSheet<UserRow>(wb, 'Users - Sales', 1);
  const allRows = [...amRows, ...salesRows];

  let upserted = 0;
  let skipped = 0;

  for (const row of allRows) {
    const email = String(row['Email'] ?? '').trim().toLowerCase();
    const sfId = String(row['18 Digit User ID'] ?? '').trim();
    const fullName = String(row['Full Name'] ?? '').trim();

    if (!email || !fullName) { skipped++; continue; }

    const startDate = excelDateToJs(row['Start Date']);
    const dateRamped = excelDateToJs(row['Date Ramped']);
    const isRamped = row['Not Ramped'] === false || row['Not Ramped'] === '' || row['Not Ramped'] === 'FALSE';
    const role = inferRole(String(row['Title'] ?? ''), String(row['Department'] ?? ''));

    if (!dryRun) {
      await prisma.user.upsert({
        where: { email },
        create: {
          salesforceId: sfId || null,
          fullName,
          email,
          title: String(row['Title'] ?? '').trim() || null,
          department: String(row['CK Department'] ?? row['Department'] ?? '').trim() || null,
          role: role as any,
          salesRegion: String(row['Sales Region'] ?? row['Region'] ?? '').trim() || null,
          country: String(row['Country (text only)'] ?? row['Country'] ?? '').trim() || null,
          seniority: String(row['Seniority'] ?? '').trim() || null,
          pod: String(row['Pods'] ?? '').trim() || null,
          managerName: String(row['Manager: Full Name'] ?? '').trim() || null,
          startDate,
          dateRamped,
          isRamped,
        },
        update: {
          salesforceId: sfId || undefined,
          fullName,
          title: String(row['Title'] ?? '').trim() || null,
          department: String(row['CK Department'] ?? row['Department'] ?? '').trim() || null,
          role: role as any,
          salesRegion: String(row['Sales Region'] ?? row['Region'] ?? '').trim() || null,
          country: String(row['Country (text only)'] ?? row['Country'] ?? '').trim() || null,
          seniority: String(row['Seniority'] ?? '').trim() || null,
          pod: String(row['Pods'] ?? '').trim() || null,
          managerName: String(row['Manager: Full Name'] ?? '').trim() || null,
          startDate: startDate ?? undefined,
          dateRamped: dateRamped ?? undefined,
          isRamped,
        },
      });
    }
    upserted++;
  }

  console.log(`   ✓ Users: ${upserted} upserted, ${skipped} skipped`);
}
