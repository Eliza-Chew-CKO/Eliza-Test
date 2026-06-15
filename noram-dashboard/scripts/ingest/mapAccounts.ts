import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { readSheet, excelDateToJs } from './parseExcel';

// Accounts are derived from both CM sheets, using the alias as the unique key.
// We build a merged map so each alias produces one Account record.

interface CMRow {
  'Client Attributes Salesforce Alias': string;
  'Client Attributes Account ID': string;
  'Salesforce Opportunity Opportunity Owner Name (Salesforce)': string;
  'Salesforce Account Account Manager Name (Salesforce)': string;
  'Client Attributes (Merchant) Entity Tier': string;
  'Client Attributes Sales Commission Incentive Rating': string;
  'Client Attributes Alias Go Live Month Month': number | string;
  'Managed? ': string;
  'Pods': string;
}

interface GoLiveRow {
  'Client Attributes Salesforce Alias': string;
  'Client Attributes Alias Go Live Month Month': number | string;
}

function normalizeTier(raw: string): string | null {
  if (!raw) return null;
  const t = String(raw).toLowerCase().trim();
  if (t.includes('tier 1') || t === '1') return 'TIER_1';
  if (t.includes('tier 2') || t === '2') return 'TIER_2';
  if (t.includes('tier 3') || t === '3') return 'TIER_3';
  return null;
}

export async function mapAccounts(
  wb: XLSX.WorkBook,
  prisma: PrismaClient,
  dryRun = false,
) {
  const fbRows = readSheet<CMRow>(wb, '1. CM - FB', 1);
  const bbRows = readSheet<CMRow>(wb, '1. CM - BB', 1);

  // Build alias → account data map, BB takes precedence for managed/tier/AM fields
  const accountMap = new Map<string, {
    alias: string;
    sfId: string;
    salesRepName: string;
    amName: string;
    tier: string | null;
    rating: string | null;
    isManaged: boolean;
    goLiveDate: Date | null;
    pod: string;
  }>();

  for (const row of [...fbRows, ...bbRows]) {
    const alias = String(row['Client Attributes Salesforce Alias'] ?? '').trim();
    if (!alias) continue;

    const existing = accountMap.get(alias);
    const tier = normalizeTier(String(row['Client Attributes (Merchant) Entity Tier'] ?? ''));
    const goLiveDate = excelDateToJs(row['Client Attributes Alias Go Live Month Month']);
    const isManaged = String(row['Managed? '] ?? '').toLowerCase().includes('managed');

    accountMap.set(alias, {
      alias,
      sfId: String(row['Client Attributes Account ID'] ?? '').trim() || (existing?.sfId ?? ''),
      salesRepName: String(row['Salesforce Opportunity Opportunity Owner Name (Salesforce)'] ?? '').trim() || (existing?.salesRepName ?? ''),
      amName: String(row['Salesforce Account Account Manager Name (Salesforce)'] ?? '').trim() || (existing?.amName ?? ''),
      tier: tier ?? existing?.tier ?? null,
      rating: String(row['Client Attributes Sales Commission Incentive Rating'] ?? '').trim() || existing?.rating || null,
      isManaged: isManaged || (existing?.isManaged ?? false),
      goLiveDate: goLiveDate ?? existing?.goLiveDate ?? null,
      pod: String(row['Pods'] ?? '').trim() || (existing?.pod ?? ''),
    });
  }

  // Also pull closed-won opps for additional accounts
  interface ClosedWonRow {
    'Account Name': string;
    '18 Digit Account ID': string;
    'Website Domain': string;
  }
  const cwRows = readSheet<ClosedWonRow>(wb, 'Closed won opps', 1);
  for (const row of cwRows) {
    const name = String(row['Account Name'] ?? '').trim();
    const sfId = String(row['18 Digit Account ID'] ?? '').trim();
    if (!name || !sfId) continue;
    // Use account name as alias fallback if not already in map
    if (!accountMap.has(name) && sfId) {
      accountMap.set(name, {
        alias: name, sfId, salesRepName: '', amName: '', tier: null, rating: null,
        isManaged: false, goLiveDate: null, pod: '',
      });
    }
  }

  let upserted = 0;

  for (const acct of accountMap.values()) {
    if (!acct.alias) continue;

    // Resolve user foreign keys by name
    const salesRep = acct.salesRepName
      ? await prisma.user.findFirst({ where: { fullName: { contains: acct.salesRepName, mode: 'insensitive' } } })
      : null;
    const accountManager = acct.amName
      ? await prisma.user.findFirst({ where: { fullName: { contains: acct.amName, mode: 'insensitive' } } })
      : null;

    if (!dryRun) {
      await prisma.account.upsert({
        where: { alias: acct.alias },
        create: {
          salesforceId: acct.sfId || `NOID-${acct.alias}`,
          alias: acct.alias,
          tier: acct.tier as any ?? undefined,
          rating: acct.rating,
          isManaged: acct.isManaged,
          salesRepId: salesRep?.id ?? null,
          accountManagerId: accountManager?.id ?? null,
          goLiveDate: acct.goLiveDate,
          pod: acct.pod || null,
        },
        update: {
          salesforceId: acct.sfId || undefined,
          tier: acct.tier as any ?? undefined,
          rating: acct.rating ?? undefined,
          isManaged: acct.isManaged,
          salesRepId: salesRep?.id ?? undefined,
          accountManagerId: accountManager?.id ?? undefined,
          goLiveDate: acct.goLiveDate ?? undefined,
          pod: acct.pod || undefined,
        },
      });
    }
    upserted++;
  }

  console.log(`   ✓ Accounts: ${upserted} upserted`);
}
