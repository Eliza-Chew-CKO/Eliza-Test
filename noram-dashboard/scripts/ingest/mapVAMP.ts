/**
 * mapVAMP.ts
 *
 * Maps rows from the "Excessive VAMP" Excel sheet to
 * Prisma VampRecordCreateInput objects.
 *
 * VAMP = Visa Acquirer Monitoring Programme
 * Accounts with excessive VAMP ratios risk fines from acquiring banks.
 *
 * Expected sheet columns:
 *   Account / Account Alias  — account identifier
 *   Month / Reporting Month  — reporting period
 *   Created Events           — total authorisation events created
 *   Fraud Events             — confirmed fraud events
 *   Total Captured Events    — total captured (settled) events
 *   VAMP Ratio               — fraud events / total captured events (may need calculation)
 *   VAMP Type                — "Fraud" | "TC40"
 *   VAMP Assessment          — "Normal" | "Excessive" (optional — derived if absent)
 *   Acquirer Country         — 2-letter ISO country code (optional)
 *   Acquirer ID              — acquirer identifier (optional)
 */

export interface VampRecordCreateInput {
  accountId: string;
  reportingMonth: Date;
  createdEvents: number;
  fraudEvents: number;
  totalCapturedEvents: number;
  vampRatio: number;
  vampType: string;
  vampAssessment: string | null;
  acquirerCountry: string | null;
  acquirerId: string | null;
}

// VAMP threshold constants (Visa standard)
const FRAUD_VAMP_THRESHOLD = 0.009;
const TC40_VAMP_THRESHOLD  = 0.005;

// ─── Assessment classification ────────────────────────────────────────────────

function classifyAssessment(vampRatio: number, vampType: string): string {
  const threshold =
    vampType.toLowerCase() === 'tc40'
      ? TC40_VAMP_THRESHOLD
      : FRAUD_VAMP_THRESHOLD;
  return vampRatio > threshold ? 'Excessive' : 'Normal';
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseNum(raw: unknown): number {
  if (raw == null) return 0;
  const n = parseFloat(String(raw).replace(/[,$%\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseInt_(raw: unknown): number {
  if (raw == null) return 0;
  const n = parseInt(String(raw).replace(/[,$\s]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function parseDate(raw: unknown): Date | null {
  if (!raw) return null;
  if (typeof raw === 'number') {
    const d = new Date((raw - 25569) * 86400 * 1000);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  const str = String(raw).trim();
  // "YYYY-MM" or "YYYY-MM-DD"
  const isoMatch = str.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, 1);
  // "Mon-YY" e.g. "Jun-25"
  const shortMatch = str.match(/^([A-Za-z]{3})-(\d{2})$/);
  if (shortMatch) {
    const d = new Date(`${shortMatch[1]} 1, ${2000 + parseInt(shortMatch[2])}`);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), 1);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), 1);
}

function get(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const val = row[key] ??
      Object.entries(row).find(([k]) => k.trim().toLowerCase() === key.toLowerCase())?.[1];
    if (val != null) return val;
  }
  return null;
}

// ─── Main mapper ──────────────────────────────────────────────────────────────

/**
 * mapVAMP
 *
 * Maps raw rows to VampRecordCreateInput.
 *
 * VAMP ratio is calculated from fraudEvents / totalCapturedEvents if not
 * explicitly provided in the sheet. Assessment is derived from ratio + type
 * if the Assessment column is absent.
 *
 * Rows with missing accountId or reportingMonth are skipped.
 */
export function mapVAMP(rows: Record<string, unknown>[]): VampRecordCreateInput[] {
  const results: VampRecordCreateInput[] = [];

  for (const row of rows) {
    const accountId = String(
      get(row, 'Account Alias', 'Account', 'Alias', 'Account ID') ?? ''
    ).trim();

    if (!accountId) {
      console.warn('[mapVAMP] Skipping row with no account identifier');
      continue;
    }

    const reportingMonth = parseDate(
      get(row, 'Month', 'Reporting Month', 'Date', 'Period')
    );
    if (!reportingMonth) {
      console.warn(`[mapVAMP] Skipping row with unparseable month for account "${accountId}"`);
      continue;
    }

    const createdEvents       = parseInt_(get(row, 'Created Events', 'Auth Events', 'Transactions'));
    const fraudEvents         = parseInt_(get(row, 'Fraud Events',   'Fraud',       'Fraud Count'));
    const totalCapturedEvents = parseInt_(get(row, 'Total Captured Events', 'Captured Events', 'Settled Events', 'Total Events'));

    // Calculate VAMP ratio if not explicitly provided
    const vampRatioRaw = get(row, 'VAMP Ratio', 'Ratio', 'VAMP %');
    let vampRatio: number;
    if (vampRatioRaw != null) {
      vampRatio = parseNum(vampRatioRaw);
      // Handle percentage values > 1 (e.g. "0.93%" stored as "0.93" not "0.0093")
      if (vampRatio > 1) vampRatio = vampRatio / 100;
    } else if (totalCapturedEvents > 0) {
      vampRatio = fraudEvents / totalCapturedEvents;
    } else {
      vampRatio = 0;
    }

    const vampType = String(
      get(row, 'VAMP Type', 'Type', 'Fraud Type') ?? 'Fraud'
    ).trim();

    const assessmentRaw = String(
      get(row, 'VAMP Assessment', 'Assessment', 'Status') ?? ''
    ).trim();
    const vampAssessment = assessmentRaw || classifyAssessment(vampRatio, vampType);

    const acquirerCountry = String(get(row, 'Acquirer Country', 'Country', 'ACQ Country') ?? '').trim() || null;
    const acquirerId      = String(get(row, 'Acquirer ID', 'Acquirer', 'ACQ ID') ?? '').trim() || null;

    results.push({
      accountId,
      reportingMonth,
      createdEvents,
      fraudEvents,
      totalCapturedEvents,
      vampRatio,
      vampType,
      vampAssessment,
      acquirerCountry,
      acquirerId,
    });
  }

  return results;
}
