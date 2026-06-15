import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { readSheet, excelDateToJs, toFloat } from './parseExcel';

// ─── 6. VAMP flags — full Looker export with ratios ───────────────────────────

interface VampFlagRow {
  'Client Attributes Entity Name': string;
  'Report Date Report Month': number | string;
  'Transaction Summary Global Acquirer ID': string;
  'Transaction Summary Payin Dispute Created Events (#)': number | string;
  'Transaction Summary Payin Fraud Events (#)': number | string;
  'Transaction Summary Payin Captured Events (#)': number | string;
  'Client Attributes Opportunity Owner Name (Salesforce)': string;
  'Client Attributes Account Name': string;
  'Client Attributes Alias': string;
  'Client Attributes Account ID': string;
  'VAMP Ratio': number | string;
  'VAMP Type (Merchant-Level)': string;
  'VAMP Assessment': number | string;
  'Domain': string;
}

// ─── 4. Excessive VAMP — curated list of flagged merchants ────────────────────

interface ExcessiveVampRow {
  'Alias': string;
  'Owner': string;
  'Domain': string;
  'Acquirer': string;
  'VAMP assessment ': number | string;
}

export async function mapVAMP(
  wb: XLSX.WorkBook,
  prisma: PrismaClient,
  dryRun = false,
) {
  // ─── Step 1: Full VAMP flag records from "6. VAMP flags" ──────────────────
  const flagRows = readSheet<VampFlagRow>(wb, '6. VAMP flags', 1);
  let flagUpserted = 0, flagSkipped = 0;

  for (const row of flagRows) {
    const alias = String(row['Client Attributes Alias'] ?? '').trim();
    const reportMonth = excelDateToJs(row['Report Date Report Month']);
    const acquirerId = String(row['Transaction Summary Global Acquirer ID'] ?? '').trim();
    if (!alias || !reportMonth) { flagSkipped++; continue; }

    const monthStart = new Date(Date.UTC(reportMonth.getUTCFullYear(), reportMonth.getUTCMonth(), 1));

    const createdEvents = Math.round(toFloat(row['Transaction Summary Payin Dispute Created Events (#)']) ?? 0);
    const fraudEvents = Math.round(toFloat(row['Transaction Summary Payin Fraud Events (#)']) ?? 0);
    const capturedEvents = Math.round(toFloat(row['Transaction Summary Payin Captured Events (#)']) ?? 0);
    const vampRatio = toFloat(row['VAMP Ratio']) ?? 0;
    const vampType = String(row['VAMP Type (Merchant-Level)'] ?? '').trim() || null;
    const vampAssessment = toFloat(row['VAMP Assessment']);
    const salesRepName = String(row['Client Attributes Opportunity Owner Name (Salesforce)'] ?? '').trim() || null;

    const account = dryRun ? null : await prisma.account.findUnique({ where: { alias } });
    const salesRep = salesRepName && !dryRun
      ? await prisma.user.findFirst({ where: { fullName: { contains: salesRepName, mode: 'insensitive' } } })
      : null;

    if (!dryRun) {
      await prisma.vampRecord.upsert({
        where: { alias_reportingMonth_globalAcquirerId: { alias, reportingMonth: monthStart, globalAcquirerId: acquirerId } },
        create: {
          accountId: account?.id ?? null,
          alias,
          entityName: String(row['Client Attributes Entity Name'] ?? '').trim() || null,
          reportingMonth: monthStart,
          globalAcquirerId: acquirerId || null,
          salesRepName,
          salesRepId: salesRep?.id ?? null,
          accountName: String(row['Client Attributes Account Name'] ?? '').trim() || null,
          websiteDomain: String(row['Domain'] ?? '').trim() || null,
          createdEvents,
          fraudEvents,
          capturedEvents,
          vampRatio,
          vampType,
          vampAssessment,
          isExcessiveFlag: false,
        },
        update: {
          createdEvents,
          fraudEvents,
          capturedEvents,
          vampRatio,
          vampType,
          vampAssessment: vampAssessment ?? undefined,
        },
      });
    }
    flagUpserted++;
  }

  // ─── Step 2: "4. Excessive VAMP" curated sheet — mark isExcessiveFlag ──────
  // This sheet has a non-standard layout: header is at row index 4 (0-based)
  const ws = wb.Sheets['4. Excessive VAMP'];
  let excessiveUpserted = 0;

  if (ws) {
    const raw = (require('xlsx') as typeof import('xlsx')).utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: '' });
    // Find the header row (contains "Alias")
    const headerIdx = raw.findIndex(r => r.some(v => String(v).trim().toLowerCase() === 'alias'));
    if (headerIdx >= 0) {
      const headers = (raw[headerIdx] as string[]).map(h => String(h).trim());
      for (let ri = headerIdx + 1; ri < raw.length; ri++) {
        const row = raw[ri] as (string | number)[];
        if (row.every(v => v === '')) continue;
        const obj: Record<string, string | number> = {};
        headers.forEach((h, idx) => { obj[h] = row[idx] ?? ''; });

        const alias = String(obj['Alias'] ?? '').trim();
        const owner = String(obj['Owner'] ?? '').trim();
        const domain = String(obj['Domain'] ?? '').trim();
        const acquirer = String(obj['Acquirer'] ?? '').trim();
        const assessment = toFloat(obj['VAMP assessment '] ?? obj['VAMP assessment']);
        if (!alias) continue;

        const account = dryRun ? null : await prisma.account.findUnique({ where: { alias } });

        if (!dryRun) {
          // Upsert a VampRecord with isExcessiveFlag=true. We don't have a specific
          // reporting month here, so we use a sentinel date (beginning of current year)
          // and will be overwritten by the 6. VAMP flags data on re-runs.
          const sentinelDate = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
          await prisma.vampRecord.upsert({
            where: { alias_reportingMonth_globalAcquirerId: { alias, reportingMonth: sentinelDate, globalAcquirerId: acquirer } },
            create: {
              accountId: account?.id ?? null,
              alias,
              reportingMonth: sentinelDate,
              globalAcquirerId: acquirer || null,
              vampRatio: 0,
              createdEvents: 0,
              fraudEvents: 0,
              capturedEvents: 0,
              isExcessiveFlag: true,
              excessiveOwner: owner || null,
              excessiveAcquirer: acquirer || null,
              vampAssessment: assessment,
              websiteDomain: domain || null,
            },
            update: {
              isExcessiveFlag: true,
              excessiveOwner: owner || null,
              excessiveAcquirer: acquirer || null,
              vampAssessment: assessment ?? undefined,
              websiteDomain: domain || null,
            },
          });
        }
        excessiveUpserted++;
      }
    }
  }

  console.log(`   ✓ VAMP flag records: ${flagUpserted} upserted, ${flagSkipped} skipped`);
  console.log(`   ✓ Excessive VAMP entries: ${excessiveUpserted} upserted`);
}
