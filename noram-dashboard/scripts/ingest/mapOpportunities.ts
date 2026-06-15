import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { readSheet, excelDateToJs, toFloat } from './parseExcel';

// ─── Stage normalization ───────────────────────────────────────────────────────

function normalizeStage(stage: string, subStage?: string): string {
  const s = String(stage ?? '').toLowerCase().trim();
  const ss = String(subStage ?? '').toUpperCase().trim();
  if (s.includes('explore') || ss.startsWith('E')) return 'EXPLORE';
  if (s.includes('propose') || ss.startsWith('P')) return 'PROPOSE';
  if (s.includes('trade') || ss.startsWith('T')) return 'TRADE';
  if (s.includes('handover') || ss.startsWith('H') || s.includes('live')) return 'HANDOVER';
  if (s.includes('closed/won') || s.includes('closed won')) return 'CLOSED_WON';
  if (s.includes('merchant lost') || s.includes('lost')) return 'MERCHANT_LOST';
  if (s.includes('disqualified')) return 'DISQUALIFIED';
  if (s.includes('closed')) return 'CLOSED_LOST';
  return 'OTHER';
}

// ─── Row types ─────────────────────────────────────────────────────────────────

interface OppCoreRow {
  'Opportunity Name': string;
  'Account Name': string;
  'Opportunity Owner': string;
  'Second Opportunity Owner': string;
  'Sales Engineer': string;
  'BDR Name': string;
  'Stage': string;
  'Sub-Stages': string;
  'Incentive Rating': string;
  'Max Opportunity Annual TPV': number | string;
  'Exp Monthly NR (Fx)': number | string;
  'Expected Revenue': number | string;
  'Age': number | string;
  'RevOps - Annual Revenue Estimate (USD)': number | string;
  'Last Commercial Activity Date': number | string;
  'Min Monthly Billing Amount': number | string;
  '18 Digit Opportunity ID': string;
  '18 Digit Account ID': string;
  'Created Date': number | string;
  'Website Domain': string;
  'Lead Source': string;
  'Lead Source Bucket': string;
  'Lead Source Detail': string;
  'Pods': string;
  'Last 90 days'?: number | string;
}

interface ClosedWonRow {
  'Opportunity Name': string;
  'Account Name': string;
  'Opportunity Owner': string;
  'Incentive Rating': string;
  '18 Digit Account ID': string;
  'Stage': string;
  'Website Domain': string;
}

interface ExploreMeetingRow extends OppCoreRow {
  'First Explore Meeting Date': number | string;
}

interface ProposeRow extends OppCoreRow {
  'Date Set to Propose': number | string;
  'Opp Status': string;
}

interface TradeRow extends OppCoreRow {
  'Date Set to Trade': number | string;
}

interface HandoverRow {
  'Opportunity Owner': string;
  'Edited By': string;
  'Field / Event': string;
  'Opportunity Name': string;
  'Sub-Stages': string;
  'Account Name': string;
  'Old Value': string;
  'New Value': string;
  'Edit Date': number | string;
  'Second Opportunity Owner': string;
  'Sales Engineer': string;
  'BDR Name': string;
  'Website URL': string;
  'Opportunity ID': string;
  'Is NORAM': number | string;
  'Exp Monthly NR (Fx) Currency': string;
  'Exp Monthly NR (Fx)': number | string;
  'Pods': string;
  'Last 90 ': number | string;
}

interface MAFRow extends OppCoreRow {
  'Date MAF Submitted By Merchant': number | string;
}

interface TechnicalRow {
  'Opportunity Owner': string;
  'Field / Event': string;
  'Opportunity Name': string;
  'Sub-Stages': string;
  'Account Name': string;
  'New Value': string;
  'Edit Date': number | string;
  'Is NORAM': number | string;
  'Second Opportunity Owner': string;
  'BDR Name': string;
  'Sales Engineer': string;
  'Website URL': string;
  'Opportunity ID': string;
  'Pods': string;
}

interface UnderwritingRow {
  'Opportunity Owner': string;
  'Field / Event': string;
  'Opportunity Name': string;
  'Sub-Stages': string;
  'Account Name': string;
  'New Value': string;
  'Edit Date': number | string;
  'Second Opportunity Owner': string;
  'BDR Name': string;
  'Sales Engineer': string;
  'Website URL': string;
  '18 Digit Opportunity ID': string;
  'Is NORAM': number | string;
  'Exp Monthly NR (Fx)': number | string;
  'Pods': string;
}

interface WeightedPipelineRow {
  'Opportunity Daily Snapshot (historical data)  Snapshot Date': number | string;
  'Salesforce Opportunities Opportunity Name': string;
  'Opportunity Daily Snapshot (historical data) Stage Name': string;
  'Salesforce Opportunities Opportunity Owner Name (Salesforce)': string;
  'Salesforce Opportunities Second Opportunity Owner Name (Salesforce)': string;
  'Opportunity Daily Snapshot (historical data) Total Region Weighted Expected Monthly Net Revenue ($)': number | string;
  'Salesforce Opportunities BDR Name (Salesforce)': string;
  'Genesis Cases Sales Engineer Name': string;
}

// ─── Build opportunity map from all sheets ────────────────────────────────────

export async function mapOpportunities(
  wb: XLSX.WorkBook,
  prisma: PrismaClient,
  dryRun = false,
) {
  // Build map keyed by SF Opportunity ID (18-digit)
  const oppMap = new Map<string, {
    sfOppId: string;
    sfAcctId: string;
    oppName: string;
    accountName: string;
    salesRepName: string;
    secondOwnerName: string;
    seName: string;
    bdrName: string;
    stage: string;
    subStage: string;
    rating: string;
    maxTPV: number | null;
    expectedMNR: number | null;
    expectedRevenue: number | null;
    ageInDays: number | null;
    revopsEstimate: number | null;
    lastActivityDate: Date | null;
    minBilling: number | null;
    createdDate: Date | null;
    websiteDomain: string;
    leadSource: string;
    leadSourceBucket: string;
    pod: string;
    last90: boolean;
    firstExploreMeeting: Date | null;
    dateSetToPropose: Date | null;
    dateSetToTrade: Date | null;
    dateSetToHandover: Date | null;
    dateMAFSubmitted: Date | null;
    dateTechnicalStage4: Date | null;
    dateUnderwritingDone: Date | null;
    handoverEditedBy: string;
    underwritingNewValue: string;
    oppStatus: string;
  }>();

  // Helper: upsert into map using core opp columns
  const mergeCoreRow = (row: OppCoreRow) => {
    const sfOppId = String(row['18 Digit Opportunity ID'] ?? '').trim();
    if (!sfOppId) return;
    const existing = oppMap.get(sfOppId) ?? {
      sfOppId, sfAcctId: '', oppName: '', accountName: '', salesRepName: '',
      secondOwnerName: '', seName: '', bdrName: '', stage: '', subStage: '',
      rating: '', maxTPV: null, expectedMNR: null, expectedRevenue: null,
      ageInDays: null, revopsEstimate: null, lastActivityDate: null,
      minBilling: null, createdDate: null, websiteDomain: '', leadSource: '',
      leadSourceBucket: '', pod: '', last90: false, firstExploreMeeting: null,
      dateSetToPropose: null, dateSetToTrade: null, dateSetToHandover: null,
      dateMAFSubmitted: null, dateTechnicalStage4: null, dateUnderwritingDone: null,
      handoverEditedBy: '', underwritingNewValue: '', oppStatus: '',
    };
    existing.sfAcctId = String(row['18 Digit Account ID'] ?? '').trim() || existing.sfAcctId;
    existing.oppName = String(row['Opportunity Name'] ?? '').trim() || existing.oppName;
    existing.accountName = String(row['Account Name'] ?? '').trim() || existing.accountName;
    existing.salesRepName = String(row['Opportunity Owner'] ?? '').trim() || existing.salesRepName;
    existing.secondOwnerName = String(row['Second Opportunity Owner'] ?? '').trim() || existing.secondOwnerName;
    existing.seName = String(row['Sales Engineer'] ?? '').trim() || existing.seName;
    existing.bdrName = String(row['BDR Name'] ?? '').trim() || existing.bdrName;
    existing.stage = String(row['Stage'] ?? '').trim() || existing.stage;
    existing.subStage = String(row['Sub-Stages'] ?? '').trim() || existing.subStage;
    existing.rating = String(row['Incentive Rating'] ?? '').trim() || existing.rating;
    existing.maxTPV = toFloat(row['Max Opportunity Annual TPV']) ?? existing.maxTPV;
    existing.expectedMNR = toFloat(row['Exp Monthly NR (Fx)']) ?? existing.expectedMNR;
    existing.expectedRevenue = toFloat(row['Expected Revenue']) ?? existing.expectedRevenue;
    existing.ageInDays = (toFloat(row['Age']) ?? existing.ageInDays) as number | null;
    existing.revopsEstimate = toFloat(row['RevOps - Annual Revenue Estimate (USD)']) ?? existing.revopsEstimate;
    existing.lastActivityDate = excelDateToJs(row['Last Commercial Activity Date']) ?? existing.lastActivityDate;
    existing.minBilling = toFloat(row['Min Monthly Billing Amount']) ?? existing.minBilling;
    existing.createdDate = excelDateToJs(row['Created Date']) ?? existing.createdDate;
    existing.websiteDomain = String(row['Website Domain'] ?? '').trim() || existing.websiteDomain;
    existing.leadSource = String(row['Lead Source'] ?? '').trim() || existing.leadSource;
    existing.leadSourceBucket = String(row['Lead Source Bucket'] ?? '').trim() || existing.leadSourceBucket;
    existing.pod = String(row['Pods'] ?? '').trim() || existing.pod;
    existing.last90 = (toFloat(row['Last 90 days']) === 1) || existing.last90;
    oppMap.set(sfOppId, existing);
  };

  // 1. All pipeline stage sheets
  for (const row of readSheet<OppCoreRow>(wb, '5. Opp created', 1)) mergeCoreRow(row);
  for (const row of readSheet<OppCoreRow>(wb, '5. Explore meetings ', 1)) {
    mergeCoreRow(row);
    const sfId = String(row['18 Digit Opportunity ID'] ?? '').trim();
    if (sfId && oppMap.has(sfId)) {
      oppMap.get(sfId)!.firstExploreMeeting = excelDateToJs((row as any)['First Explore Meeting Date']);
    }
  }
  for (const row of readSheet<ProposeRow>(wb, '5. Propose ', 1)) {
    mergeCoreRow(row as any);
    const sfId = String(row['18 Digit Opportunity ID'] ?? '').trim();
    if (sfId && oppMap.has(sfId)) {
      oppMap.get(sfId)!.dateSetToPropose = excelDateToJs(row['Date Set to Propose']);
      oppMap.get(sfId)!.oppStatus = String(row['Opp Status'] ?? '').trim();
    }
  }
  for (const row of readSheet<TradeRow>(wb, '5. Trade ', 1)) {
    mergeCoreRow(row as any);
    const sfId = String(row['18 Digit Opportunity ID'] ?? '').trim();
    if (sfId && oppMap.has(sfId)) {
      oppMap.get(sfId)!.dateSetToTrade = excelDateToJs(row['Date Set to Trade']);
    }
  }
  for (const row of readSheet<HandoverRow>(wb, '5. Handover ', 1)) {
    const sfOppId = String(row['Opportunity ID'] ?? '').trim();
    if (!sfOppId) continue;
    const existing = oppMap.get(sfOppId) ?? {
      sfOppId, sfAcctId: '', oppName: String(row['Opportunity Name'] ?? '').trim(),
      accountName: String(row['Account Name'] ?? '').trim(),
      salesRepName: String(row['Opportunity Owner'] ?? '').trim(),
      secondOwnerName: String(row['Second Opportunity Owner'] ?? '').trim(),
      seName: String(row['Sales Engineer'] ?? '').trim(),
      bdrName: String(row['BDR Name'] ?? '').trim(),
      stage: 'Handover', subStage: String(row['Sub-Stages'] ?? '').trim(),
      rating: '', maxTPV: null, expectedMNR: toFloat(row['Exp Monthly NR (Fx)']),
      expectedRevenue: null, ageInDays: null, revopsEstimate: null,
      lastActivityDate: null, minBilling: null, createdDate: null,
      websiteDomain: String(row['Website URL'] ?? '').trim(),
      leadSource: '', leadSourceBucket: '', pod: String(row['Pods'] ?? '').trim(),
      last90: toFloat(row['Last 90 ']) === 1, firstExploreMeeting: null,
      dateSetToPropose: null, dateSetToTrade: null,
      dateSetToHandover: excelDateToJs(row['Edit Date']),
      dateMAFSubmitted: null, dateTechnicalStage4: null, dateUnderwritingDone: null,
      handoverEditedBy: String(row['Edited By'] ?? '').trim(),
      underwritingNewValue: '', oppStatus: '',
    };
    existing.dateSetToHandover = excelDateToJs(row['Edit Date']) ?? existing.dateSetToHandover;
    existing.handoverEditedBy = String(row['Edited By'] ?? '').trim() || existing.handoverEditedBy;
    oppMap.set(sfOppId, existing);
  }
  for (const row of readSheet<MAFRow>(wb, '5. MAF submitted', 1)) {
    mergeCoreRow(row as any);
    const sfId = String(row['18 Digit Opportunity ID'] ?? '').trim();
    if (sfId && oppMap.has(sfId)) {
      oppMap.get(sfId)!.dateMAFSubmitted = excelDateToJs(row['Date MAF Submitted By Merchant']);
    }
  }
  for (const row of readSheet<TechnicalRow>(wb, '5. Technical ', 1)) {
    const sfId = String(row['Opportunity ID'] ?? '').trim();
    if (!sfId) continue;
    if (oppMap.has(sfId)) {
      oppMap.get(sfId)!.dateTechnicalStage4 = excelDateToJs(row['Edit Date']);
    }
  }
  for (const row of readSheet<UnderwritingRow>(wb, '5. Underwriting', 1)) {
    const sfId = String(row['18 Digit Opportunity ID'] ?? '').trim();
    if (!sfId) continue;
    if (oppMap.has(sfId)) {
      oppMap.get(sfId)!.dateUnderwritingDone = excelDateToJs(row['Edit Date']);
      oppMap.get(sfId)!.underwritingNewValue = String(row['New Value'] ?? '').trim();
    }
  }
  // 2. Closed won (no SF Opp ID in that sheet — use name+account as key)
  for (const row of readSheet<ClosedWonRow>(wb, 'Closed won opps', 1)) {
    const oppName = String(row['Opportunity Name'] ?? '').trim();
    if (!oppName) continue;
    // Synthetic ID so we can still upsert
    const synthId = `CW-${String(row['18 Digit Account ID'] ?? '').trim()}-${oppName.slice(0, 40)}`;
    if (!oppMap.has(synthId)) {
      oppMap.set(synthId, {
        sfOppId: synthId, sfAcctId: String(row['18 Digit Account ID'] ?? '').trim(),
        oppName, accountName: String(row['Account Name'] ?? '').trim(),
        salesRepName: String(row['Opportunity Owner'] ?? '').trim(),
        secondOwnerName: '', seName: '', bdrName: '',
        stage: String(row['Stage'] ?? '').trim(), subStage: '',
        rating: String(row['Incentive Rating'] ?? '').trim(),
        maxTPV: null, expectedMNR: null, expectedRevenue: null, ageInDays: null,
        revopsEstimate: null, lastActivityDate: null, minBilling: null,
        createdDate: null, websiteDomain: String(row['Website Domain'] ?? '').trim(),
        leadSource: '', leadSourceBucket: '', pod: '', last90: false,
        firstExploreMeeting: null, dateSetToPropose: null, dateSetToTrade: null,
        dateSetToHandover: null, dateMAFSubmitted: null, dateTechnicalStage4: null,
        dateUnderwritingDone: null, handoverEditedBy: '', underwritingNewValue: '', oppStatus: '',
      });
    }
  }

  // ─── Upsert opportunities ─────────────────────────────────────────────────
  let upserted = 0;
  let skipped = 0;

  for (const opp of oppMap.values()) {
    if (!opp.oppName) { skipped++; continue; }

    // Resolve FK: account
    let account = opp.sfAcctId
      ? await prisma.account.findFirst({ where: { salesforceId: opp.sfAcctId } })
      : null;
    if (!account && opp.accountName) {
      account = await prisma.account.findFirst({
        where: { OR: [{ alias: { contains: opp.accountName, mode: 'insensitive' } }, { accountName: { contains: opp.accountName, mode: 'insensitive' } }] },
      });
    }
    const salesRep = opp.salesRepName
      ? await prisma.user.findFirst({ where: { fullName: { contains: opp.salesRepName, mode: 'insensitive' } } })
      : null;
    const secondOwner = opp.secondOwnerName
      ? await prisma.user.findFirst({ where: { fullName: { contains: opp.secondOwnerName, mode: 'insensitive' } } })
      : null;

    const normalizedStage = normalizeStage(opp.stage, opp.subStage);

    if (!dryRun) {
      await prisma.opportunity.upsert({
        where: { salesforceId: opp.sfOppId },
        create: {
          salesforceId: opp.sfOppId,
          opportunityName: opp.oppName,
          accountId: account?.id ?? null,
          accountName: opp.accountName,
          salesRepId: salesRep?.id ?? null,
          salesRepName: opp.salesRepName || null,
          secondOwnerId: secondOwner?.id ?? null,
          secondOwnerName: opp.secondOwnerName || null,
          salesEngineerName: opp.seName || null,
          bdrName: opp.bdrName || null,
          stage: opp.stage,
          subStage: opp.subStage || null,
          normalizedStage: normalizedStage as any,
          rating: opp.rating || null,
          expectedMonthlyNR: opp.expectedMNR,
          expectedRevenue: opp.expectedRevenue,
          maxAnnualTPV: opp.maxTPV,
          minMonthlyBilling: opp.minBilling,
          revopsAnnualEstimate: opp.revopsEstimate,
          lastActivityDate: opp.lastActivityDate,
          createdDate: opp.createdDate,
          ageInDays: opp.ageInDays,
          leadSource: opp.leadSource || null,
          leadSourceBucket: opp.leadSourceBucket || null,
          websiteDomain: opp.websiteDomain || null,
          pod: opp.pod || null,
          last90Days: opp.last90,
          oppStatus: opp.oppStatus || null,
          firstExploreMeetingDate: opp.firstExploreMeeting,
          dateSetToPropose: opp.dateSetToPropose,
          dateSetToTrade: opp.dateSetToTrade,
          dateSetToHandover: opp.dateSetToHandover,
          dateMAFSubmitted: opp.dateMAFSubmitted,
          dateTechnicalStage4: opp.dateTechnicalStage4,
          dateUnderwritingDone: opp.dateUnderwritingDone,
          handoverEditedBy: opp.handoverEditedBy || null,
          underwritingNewValue: opp.underwritingNewValue || null,
        },
        update: {
          accountId: account?.id ?? undefined,
          salesRepId: salesRep?.id ?? undefined,
          salesRepName: opp.salesRepName || undefined,
          secondOwnerId: secondOwner?.id ?? undefined,
          secondOwnerName: opp.secondOwnerName || undefined,
          stage: opp.stage || undefined,
          subStage: opp.subStage || undefined,
          normalizedStage: normalizedStage as any,
          rating: opp.rating || undefined,
          expectedMonthlyNR: opp.expectedMNR ?? undefined,
          expectedRevenue: opp.expectedRevenue ?? undefined,
          maxAnnualTPV: opp.maxTPV ?? undefined,
          lastActivityDate: opp.lastActivityDate ?? undefined,
          last90Days: opp.last90,
          firstExploreMeetingDate: opp.firstExploreMeeting ?? undefined,
          dateSetToPropose: opp.dateSetToPropose ?? undefined,
          dateSetToTrade: opp.dateSetToTrade ?? undefined,
          dateSetToHandover: opp.dateSetToHandover ?? undefined,
          dateMAFSubmitted: opp.dateMAFSubmitted ?? undefined,
          dateTechnicalStage4: opp.dateTechnicalStage4 ?? undefined,
          dateUnderwritingDone: opp.dateUnderwritingDone ?? undefined,
          underwritingNewValue: opp.underwritingNewValue || undefined,
        },
      });
    }
    upserted++;
  }

  // ─── Pipeline snapshots (weighted pipeline history) ────────────────────────
  let snapshotUpserted = 0;
  const wpRows = readSheet<WeightedPipelineRow>(wb, 'Weighted pipeline', 1);
  for (const row of wpRows) {
    const oppName = String(row['Salesforce Opportunities Opportunity Name'] ?? '').trim();
    const snapshotDate = excelDateToJs(row['Opportunity Daily Snapshot (historical data)  Snapshot Date']);
    if (!oppName || !snapshotDate) continue;

    const opp = dryRun ? null : await prisma.opportunity.findFirst({
      where: { opportunityName: { contains: oppName.slice(0, 50), mode: 'insensitive' } },
    });
    if (!opp && !dryRun) continue;

    const weightedMNR = toFloat(row['Opportunity Daily Snapshot (historical data) Total Region Weighted Expected Monthly Net Revenue ($)']) ?? 0;

    if (!dryRun && opp) {
      await prisma.pipelineSnapshot.upsert({
        where: { opportunityId_snapshotDate: { opportunityId: opp.id, snapshotDate } },
        create: {
          opportunityId: opp.id,
          opportunityName: oppName,
          snapshotDate,
          stageName: String(row['Opportunity Daily Snapshot (historical data) Stage Name'] ?? '').trim(),
          salesRepName: String(row['Salesforce Opportunities Opportunity Owner Name (Salesforce)'] ?? '').trim() || null,
          secondOwnerName: String(row['Salesforce Opportunities Second Opportunity Owner Name (Salesforce)'] ?? '').trim() || null,
          bdrName: String(row['Salesforce Opportunities BDR Name (Salesforce)'] ?? '').trim() || null,
          salesEngineerName: String(row['Genesis Cases Sales Engineer Name'] ?? '').trim() || null,
          weightedExpectedMNR: weightedMNR,
        },
        update: {
          stageName: String(row['Opportunity Daily Snapshot (historical data) Stage Name'] ?? '').trim(),
          weightedExpectedMNR: weightedMNR,
        },
      });
      snapshotUpserted++;
    } else {
      snapshotUpserted++;
    }
  }

  console.log(`   ✓ Opportunities: ${upserted} upserted, ${skipped} skipped`);
  console.log(`   ✓ Pipeline snapshots: ${snapshotUpserted} upserted`);
}
