import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { readSheet, excelDateToJs, toFloat } from './parseExcel';

interface CMFBRow {
  'Dates Reporting Month': number | string;
  'Client Attributes Salesforce Alias': string;
  'Salesforce Opportunity Opportunity Owner Name (Salesforce)': string;
  'Volumes and Counts TPV': number | string;
  'Total Fee Revenue/Cost Total Fee (inc Gross FX and CCP)': number | string;
  'Total Fee Revenue/Cost Total Fee (inc Net FX and CCP)': number | string;
  'Client Attributes Total Expected Monthly Net Revenue ($)': number | string;
  'Fee Revenue/Cost Minimum Billing': number | string;
  'Client Attributes Sales Commission Incentive Rating': string;
  'Client Attributes Alias Go Live Month Month': number | string;
  'Client Attributes Account ID': string;
  'Client Attributes Client ID': string;
  'Pods': string;
}

interface CMBBRow {
  'Dates Reporting Month': number | string;
  'Client Attributes Salesforce Alias': string;
  'Salesforce Opportunity Opportunity Owner Name (Salesforce)': string;
  'Salesforce Account Account Manager Name (Salesforce)': string;
  'Client Attributes (Merchant) Entity Tier': string;
  'Client Attributes Sales Commission Incentive Rating': string;
  'Client Attributes Alias Go Live Month Month': number | string;
  'Client Attributes Account ID': string;
  'Volumes and Counts TPV': number | string;
  'Total Fee Revenue/Cost Total Fee (inc Gross FX and CCP)': number | string;
  'Client Attributes Total Expected Monthly Net Revenue ($)': number | string;
  'Fee Revenue/Cost Minimum Billing': number | string;
  'Pods': string;
  'Managed? ': string;
}

interface TPVRow {
  'Report Date Report Date': number | string;
  'Transaction Summary Payments Volume Amount ($)': number | string;
  'Client Attributes Opportunity Owner Name (Salesforce)': string;
  'Pods': string;
}

export async function mapFinancials(
  wb: XLSX.WorkBook,
  prisma: PrismaClient,
  dryRun = false,
) {
  // ─── Frontbook CM ──────────────────────────────────────────────────────────
  const fbRows = readSheet<CMFBRow>(wb, '1. CM - FB', 1);
  let fbUpserted = 0, fbSkipped = 0;

  for (const row of fbRows) {
    const alias = String(row['Client Attributes Salesforce Alias'] ?? '').trim();
    const reportingMonth = excelDateToJs(row['Dates Reporting Month']);
    if (!alias || !reportingMonth) { fbSkipped++; continue; }

    // Normalise to first of month
    const monthStart = new Date(Date.UTC(reportingMonth.getUTCFullYear(), reportingMonth.getUTCMonth(), 1));

    const account = dryRun ? null : await prisma.account.findUnique({ where: { alias } });
    if (!account && !dryRun) { fbSkipped++; continue; }

    const totalFeeGross = toFloat(row['Total Fee Revenue/Cost Total Fee (inc Gross FX and CCP)']) ?? 0;
    const totalFeeNet = toFloat(row['Total Fee Revenue/Cost Total Fee (inc Net FX and CCP)']);
    const emnr = toFloat(row['Client Attributes Total Expected Monthly Net Revenue ($)']);
    const minBilling = toFloat(row['Fee Revenue/Cost Minimum Billing']);
    const tpv = toFloat(row['Volumes and Counts TPV']);

    if (!dryRun && account) {
      await prisma.financialActual.upsert({
        where: { accountId_reportingMonth_bookType: { accountId: account.id, reportingMonth: monthStart, bookType: 'FRONTBOOK' } },
        create: {
          accountId: account.id,
          reportingMonth: monthStart,
          bookType: 'FRONTBOOK',
          salesRepName: String(row['Salesforce Opportunity Opportunity Owner Name (Salesforce)'] ?? '').trim() || null,
          rating: String(row['Client Attributes Sales Commission Incentive Rating'] ?? '').trim() || null,
          pod: String(row['Pods'] ?? '').trim() || null,
          totalFeeIncGrossFX: totalFeeGross,
          totalFeeIncNetFX: totalFeeNet,
          expectedMNR: emnr,
          minBilling,
          tpvAmount: tpv,
        },
        update: {
          totalFeeIncGrossFX: totalFeeGross,
          totalFeeIncNetFX: totalFeeNet ?? undefined,
          expectedMNR: emnr ?? undefined,
          minBilling: minBilling ?? undefined,
          tpvAmount: tpv ?? undefined,
        },
      });
    }
    fbUpserted++;
  }

  // ─── Backbook CM ──────────────────────────────────────────────────────────
  const bbRows = readSheet<CMBBRow>(wb, '1. CM - BB', 1);
  let bbUpserted = 0, bbSkipped = 0;

  for (const row of bbRows) {
    const alias = String(row['Client Attributes Salesforce Alias'] ?? '').trim();
    const reportingMonth = excelDateToJs(row['Dates Reporting Month']);
    if (!alias || !reportingMonth) { bbSkipped++; continue; }

    const monthStart = new Date(Date.UTC(reportingMonth.getUTCFullYear(), reportingMonth.getUTCMonth(), 1));
    const account = dryRun ? null : await prisma.account.findUnique({ where: { alias } });
    if (!account && !dryRun) { bbSkipped++; continue; }

    const totalFeeGross = toFloat(row['Total Fee Revenue/Cost Total Fee (inc Gross FX and CCP)']) ?? 0;
    const emnr = toFloat(row['Client Attributes Total Expected Monthly Net Revenue ($)']);
    const minBilling = toFloat(row['Fee Revenue/Cost Minimum Billing']);
    const tpv = toFloat(row['Volumes and Counts TPV']);
    const isManaged = String(row['Managed? '] ?? '').toLowerCase().includes('managed');
    const tier = String(row['Client Attributes (Merchant) Entity Tier'] ?? '').trim() || null;

    if (!dryRun && account) {
      await prisma.financialActual.upsert({
        where: { accountId_reportingMonth_bookType: { accountId: account.id, reportingMonth: monthStart, bookType: 'BACKBOOK' } },
        create: {
          accountId: account.id,
          reportingMonth: monthStart,
          bookType: 'BACKBOOK',
          salesRepName: String(row['Salesforce Opportunity Opportunity Owner Name (Salesforce)'] ?? '').trim() || null,
          accountManagerName: String(row['Salesforce Account Account Manager Name (Salesforce)'] ?? '').trim() || null,
          tier,
          rating: String(row['Client Attributes Sales Commission Incentive Rating'] ?? '').trim() || null,
          pod: String(row['Pods'] ?? '').trim() || null,
          isManaged,
          totalFeeIncGrossFX: totalFeeGross,
          expectedMNR: emnr,
          minBilling,
          tpvAmount: tpv,
        },
        update: {
          totalFeeIncGrossFX: totalFeeGross,
          isManaged,
          tier: tier ?? undefined,
          expectedMNR: emnr ?? undefined,
          minBilling: minBilling ?? undefined,
          tpvAmount: tpv ?? undefined,
        },
      });
    }
    bbUpserted++;
  }

  // ─── US BIN TPV ───────────────────────────────────────────────────────────
  const tpvRows = readSheet<TPVRow>(wb, '2. TPV - US Bin', 1);
  let tpvUpserted = 0, tpvSkipped = 0;

  for (const row of tpvRows) {
    const reportDate = excelDateToJs(row['Report Date Report Date']);
    const volume = toFloat(row['Transaction Summary Payments Volume Amount ($)']);
    if (!reportDate || volume == null) { tpvSkipped++; continue; }

    const salesRepName = String(row['Client Attributes Opportunity Owner Name (Salesforce)'] ?? '').trim() || null;
    const pod = String(row['Pods'] ?? '').trim() || null;

    if (!dryRun) {
      await prisma.tpvActual.upsert({
        where: { reportDate_salesRepName: { reportDate, salesRepName: salesRepName ?? '' } },
        create: { reportDate, paymentVolume: volume, salesRepName, pod },
        update: { paymentVolume: volume, pod: pod ?? undefined },
      });
    }
    tpvUpserted++;
  }

  // ─── Go-Lives ─────────────────────────────────────────────────────────────
  interface GoLiveRow {
    'Dates Reporting Month': number | string;
    'Client Attributes Salesforce Alias': string;
    'Salesforce Opportunity Opportunity Owner Name (Salesforce)': string;
    'Salesforce Opportunity zComp Second Opp Owner Name (Salesforce)': string;
    'Salesforce Opportunity Opportunity Owner\'s Manager Name': string;
    'Client Attributes Incentive Rating': string;
    'Client Attributes Alias Go Live Month Month': number | string;
    'Pods': string;
  }
  const glRows = readSheet<GoLiveRow>(wb, '3. Go-lives', 1);
  let glUpserted = 0;
  for (const row of glRows) {
    const alias = String(row['Client Attributes Salesforce Alias'] ?? '').trim();
    const reportingMonth = excelDateToJs(row['Dates Reporting Month']);
    if (!alias || !reportingMonth) continue;
    const monthStart = new Date(Date.UTC(reportingMonth.getUTCFullYear(), reportingMonth.getUTCMonth(), 1));
    const account = dryRun ? null : await prisma.account.findUnique({ where: { alias } });
    const salesRepName = String(row['Salesforce Opportunity Opportunity Owner Name (Salesforce)'] ?? '').trim();
    const salesRep = salesRepName && !dryRun
      ? await prisma.user.findFirst({ where: { fullName: { contains: salesRepName, mode: 'insensitive' } } })
      : null;
    const goLiveDate = excelDateToJs(row['Client Attributes Alias Go Live Month Month']);

    if (!dryRun) {
      await prisma.goLive.upsert({
        where: { alias_reportingMonth: { alias, reportingMonth: monthStart } },
        create: {
          accountId: account?.id ?? null,
          alias,
          reportingMonth: monthStart,
          goLiveMonth: goLiveDate,
          salesRepId: salesRep?.id ?? null,
          salesRepName: salesRepName || null,
          secondOwnerName: String(row['Salesforce Opportunity zComp Second Opp Owner Name (Salesforce)'] ?? '').trim() || null,
          managerName: String(row['Salesforce Opportunity Opportunity Owner\'s Manager Name'] ?? '').trim() || null,
          rating: String(row['Client Attributes Incentive Rating'] ?? '').trim() || null,
          pod: String(row['Pods'] ?? '').trim() || null,
        },
        update: {
          goLiveMonth: goLiveDate ?? undefined,
          salesRepId: salesRep?.id ?? undefined,
        },
      });
    }
    glUpserted++;
  }

  console.log(`   ✓ Frontbook financials: ${fbUpserted} upserted, ${fbSkipped} skipped`);
  console.log(`   ✓ Backbook financials: ${bbUpserted} upserted, ${bbSkipped} skipped`);
  console.log(`   ✓ US BIN TPV rows: ${tpvUpserted} upserted, ${tpvSkipped} skipped`);
  console.log(`   ✓ Go-lives: ${glUpserted} upserted`);
}
