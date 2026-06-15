/**
 * mapVAMP.ts
 *
 * Maps rows from the "Excessive VAMP" sheet to Prisma VampRecordCreateInput objects.
 *
 * VAMP (Visa Acquirer Monitoring Programme) records capture fraud event data
 * used to track whether an account is at risk of scheme penalties.
 *
 * Expected sheet columns:
 *   Account / Alias       — account alias (foreign key)
 *   Reporting Month       — month of the record
 *   Created Events        — total authorised/captured events
 *   Fraud Events          — number of fraud-confirmed events
 *   Total Captured Events — total captured transaction count (may differ from Created)
 *   VAMP Ratio            — pre-computed ratio; if absent, computed as fraudEvents / totalCapturedEvents
 *   VAMP Type             — "VISA_VAMP" | "MC_MATCH" | etc.
 *   Assessment            — acquirer's assessment label (e.g. "Excessive", "At Risk")
 *   Acquirer Country      — ISO country code of the acquiring bank
 *   Acquirer ID           — acquirer identifier
 *
 * Classification thresholds (apply if vampAssessment is not provided):
 *   ratio < 0.005          → "Healthy"
 *   0.005 ≤ ratio < 0.010  → "At Risk"
 *   ratio ≥ 0.010          → "Excessive"
 */

type VampRecordCreateInput = {
  accountId: string;           // alias placeholder — resolve after account upsert
  reportingMonth: Date;
  createdEvents: number;
  fraudEvents: number;
  totalCapturedEvents: number;
  vampRatio: number;
  vampType: string;
  vampAssessment?: string;
  acquirerCountry?: string;
  acquirerId?: string;
};

function parseAmount(val: unknown): number {
  const n = parseFloat(String(val ?? '0').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseInt10(val: unknown): number {
  const n = parseInt(String(val ?? '0').replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function parseReportingMonth(val: unknown): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) {
    return new Date(Date.UTC(val.getFullYear(), val.getMonth(), 1));
  }
  const s = String(val).trim();
  const shortMatch = s.match(/^([A-Za-z]{3})[-\s](\d{2})$/);
  if (shortMatch) {
    const d = new Date(`${shortMatch[1]} 20${shortMatch[2]}`);
    if (!isNaN(d.getTime())) return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
  return undefined;
}

/**
 * classifyVampRatio
 * Returns a human-readable assessment based on the VAMP ratio value.
 */
function classifyVampRatio(ratio: number): string {
  if (ratio >= 0.01)  return 'Excessive';
  if (ratio >= 0.005) return 'At Risk';
  return 'Healthy';
}

/**
 * mapVAMP
 */
export function mapVAMP(rows: Record<string, unknown>[]): VampRecordCreateInput[] {
  const results: VampRecordCreateInput[] = [];

  for (const row of rows) {
    const alias = String(row['Account'] ?? row['Alias'] ?? row['Account Name'] ?? '').trim();
    if (!alias) continue;

    const reportingMonth = parseReportingMonth(row['Reporting Month'] ?? row['Month']);
    if (!reportingMonth) continue;

    const createdEvents       = parseInt10(row['Created Events'] ?? row['Authorised Events']);
    const fraudEvents         = parseInt10(row['Fraud Events'] ?? row['Chargebacks']);
    const totalCapturedEvents = parseInt10(
      row['Total Captured Events'] ?? row['Captured Events'] ?? createdEvents
    );

    // Use pre-computed ratio if present; otherwise calculate
    let vampRatio = parseAmount(row['VAMP Ratio'] ?? row['Ratio']);
    if (vampRatio === 0 && totalCapturedEvents > 0) {
      vampRatio = fraudEvents / totalCapturedEvents;
    }

    const vampType = String(row['VAMP Type'] ?? row['Type'] ?? 'VISA_VAMP').trim();
    const rawAssessment = String(row['Assessment'] ?? row['VAMP Assessment'] ?? '').trim();
    const vampAssessment = rawAssessment || classifyVampRatio(vampRatio);

    const acquirerCountry = String(row['Acquirer Country'] ?? '').trim() || undefined;
    const acquirerId      = String(row['Acquirer ID'] ?? row['Acquirer'] ?? '').trim() || undefined;

    results.push({
      accountId: alias,
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
