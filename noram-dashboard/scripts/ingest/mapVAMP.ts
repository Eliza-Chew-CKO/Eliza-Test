/**
 * mapVAMP.ts
 *
 * Maps rows from the "Excessive VAMP" sheet to VampRecord objects.
 *
 * Expected sheet columns:
 *   Alias                   — account alias (matched to Account.alias)
 *   Owner                   — sales rep name or email (informational, not stored separately)
 *   Reporting Month         — "YYYY-MM" or date string
 *   Acquirer                — acquirer ID string
 *   Acquirer Country        — ISO 2-letter country code (e.g. "US", "GB")
 *   Created Events          — total transaction events created
 *   Fraud Events            — events flagged as fraudulent
 *   Total Captured Events   — total captured (settled) events
 *   VAMP Ratio              — (optional) pre-calculated; computed if missing
 *
 * VAMP Classification Logic:
 *   vampRatio = fraudEvents / totalCapturedEvents
 *   EXCESSIVE if: vampRatio > 0.015 AND fraudEvents > 1,500
 *   Assessment Charge (when EXCESSIVE): (createdEvents + fraudEvents) * $8
 *
 * The @@unique([accountId, reportingMonth, acquirerId]) constraint makes
 * re-runs safe (upsert by natural key).
 */

// ─── Column name constants ─────────────────────────────────────────────────────
const COL_ALIAS = 'Alias';
const COL_REPORTING_MONTH = 'Reporting Month';
const COL_ACQUIRER = 'Acquirer';
const COL_ACQUIRER_COUNTRY = 'Acquirer Country';
const COL_CREATED_EVENTS = 'Created Events';
const COL_FRAUD_EVENTS = 'Fraud Events';
const COL_TOTAL_CAPTURED_EVENTS = 'Total Captured Events';
const COL_VAMP_RATIO = 'VAMP Ratio';

// ─── Thresholds ────────────────────────────────────────────────────────────────
const EXCESSIVE_RATIO_THRESHOLD = 0.015;   // Visa threshold
const EXCESSIVE_FRAUD_EVENT_THRESHOLD = 1_500;
const ASSESSMENT_CHARGE_PER_EVENT = 8;     // USD per event when Excessive

// ─── Parsers ───────────────────────────────────────────────────────────────────

function parseReportingMonth(value: unknown): Date {
  const str = String(value ?? '').trim();
  if (/^\d{4}-\d{2}$/.test(str)) return new Date(`${str}-01`);
  const asNum = Number(str);
  if (!isNaN(asNum) && asNum > 40_000) {
    const d = new Date((asNum - 25569) * 86400 * 1000);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
  return new Date();
}

function parseIntSafe(value: unknown): number {
  const n = parseInt(String(value ?? '0').replace(/,/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function parseFloatSafe(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = parseFloat(String(value).replace(/[%,]/g, ''));
  return isNaN(n) ? null : n;
}

export interface VampRow {
  [key: string]: unknown;
}

/**
 * mapVAMP
 *
 * Upserts VampRecord rows from the "Excessive VAMP" sheet.
 *
 * @param rows        — raw Excel rows from readSheet()
 * @param prismaClient — PrismaClient instance
 */
export async function mapVAMP(rows: VampRow[], prismaClient: any): Promise<void> {
  let upserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const alias = String(row[COL_ALIAS] ?? '').trim();
    if (!alias) {
      skipped++;
      continue;
    }

    // Look up account by alias
    const account = await prismaClient.account.findUnique({ where: { alias } });
    if (!account) {
      console.warn(`[mapVAMP] No account found for alias: "${alias}"`);
      skipped++;
      continue;
    }

    const reportingMonth = parseReportingMonth(row[COL_REPORTING_MONTH]);
    const acquirerId = row[COL_ACQUIRER]
      ? String(row[COL_ACQUIRER]).trim() || null
      : null;
    const acquirerCountry = row[COL_ACQUIRER_COUNTRY]
      ? String(row[COL_ACQUIRER_COUNTRY]).trim().toUpperCase() || null
      : null;

    const createdEvents = parseIntSafe(row[COL_CREATED_EVENTS]);
    const fraudEvents = parseIntSafe(row[COL_FRAUD_EVENTS]);
    const totalCapturedEvents = parseIntSafe(row[COL_TOTAL_CAPTURED_EVENTS]);

    // Use pre-calculated ratio if present, otherwise compute it
    const preCalcRatio = parseFloatSafe(row[COL_VAMP_RATIO]);
    const vampRatio =
      preCalcRatio !== null
        ? preCalcRatio
        : totalCapturedEvents > 0
        ? fraudEvents / totalCapturedEvents
        : 0;

    // Classify as EXCESSIVE per Visa thresholds
    const isExcessive =
      vampRatio > EXCESSIVE_RATIO_THRESHOLD && fraudEvents > EXCESSIVE_FRAUD_EVENT_THRESHOLD;
    const vampType = isExcessive ? 'EXCESSIVE' : 'NORMAL';

    // Assessment charge only applies to EXCESSIVE accounts
    const vampAssessment = isExcessive
      ? String((createdEvents + fraudEvents) * ASSESSMENT_CHARGE_PER_EVENT)
      : null;

    await prismaClient.vampRecord.upsert({
      where: {
        accountId_reportingMonth_acquirerId: {
          accountId: account.id,
          reportingMonth,
          acquirerId: acquirerId ?? '',
        },
      },
      create: {
        accountId: account.id,
        reportingMonth,
        createdEvents,
        fraudEvents,
        totalCapturedEvents,
        vampRatio,
        vampType,
        vampAssessment,
        acquirerCountry,
        acquirerId,
      },
      update: {
        createdEvents,
        fraudEvents,
        totalCapturedEvents,
        vampRatio,
        vampType,
        vampAssessment,
        acquirerCountry,
      },
    });

    upserted++;
  }

  console.log(`[mapVAMP] Upserted ${upserted} VAMP records, skipped ${skipped}.`);
}
