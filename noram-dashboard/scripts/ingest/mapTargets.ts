import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { excelDateToJs, toFloat } from './parseExcel';

// The Targets sheet is a formatted spreadsheet (not a plain table).
// We parse it by scanning for known row labels and reading the 12 monthly columns.

const MONTH_COL_OFFSET = 2; // columns C..N (index 2..13) hold Jan-Dec values

/** Return rows from the sheet as raw 2D array. */
function getRawRows(wb: XLSX.WorkBook): (string | number)[][] {
  const ws = wb.Sheets['Targets'];
  if (!ws) { console.warn('  ⚠ Targets sheet not found'); return []; }
  const data = (require('xlsx') as typeof import('xlsx')).utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: '' });
  return data as (string | number)[][];
}

/** Find a row whose first non-empty cell matches the label (case-insensitive). */
function findRow(rows: (string | number)[][], label: string): (string | number)[] | null {
  for (const row of rows) {
    const first = String(row.find(v => v !== '') ?? '').toLowerCase().trim();
    if (first.includes(label.toLowerCase())) return row;
  }
  return null;
}

export async function mapTargets(
  wb: XLSX.WorkBook,
  prisma: PrismaClient,
  dryRun = false,
) {
  const rows = getRawRows(wb);
  let upserted = 0;

  // ─── Locate the date header row (contains Excel serial dates for Jan-Dec) ──
  // Row 7 (0-indexed) is: ["Date","",46053,46081,...] for FB targets
  const dateRowIdx = rows.findIndex(r => String(r[0]).toLowerCase().trim() === 'date' && typeof r[2] === 'number' && r[2] > 40000);
  if (dateRowIdx < 0) {
    console.warn('   ⚠ Could not locate date header row in Targets sheet');
    return;
  }
  const dateRow = rows[dateRowIdx];
  // Build month list from columns C..N
  const periods: Date[] = [];
  for (let col = MONTH_COL_OFFSET; col <= 13; col++) {
    const d = excelDateToJs(dateRow[col]);
    if (d) periods.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
  }

  // Helper: upsert 12 monthly values for a target type
  const upsertTargetRow = async (rowLabel: string, targetType: string) => {
    const row = findRow(rows, rowLabel);
    if (!row) { console.warn(`   ⚠ Target row not found: "${rowLabel}"`); return; }
    for (let i = 0; i < periods.length; i++) {
      const amount = toFloat(row[i + MONTH_COL_OFFSET]);
      if (amount == null) continue;
      if (!dryRun) {
        await prisma.target.upsert({
          where: { period_type: { period: periods[i], type: targetType as any } },
          create: { period: periods[i], type: targetType as any, amount },
          update: { amount },
        });
      }
      upserted++;
    }
  };

  // ─── Frontbook NR targets ──────────────────────────────────────────────────
  // "2026 incremental" row = monthly incremental frontbook NR ($K)
  await upsertTargetRow('2026 incremental', 'FRONTBOOK_NR');
  // Cumulative row (second blank-label row after incremental) = YTD cumulative
  // It's the row after "2026 incremental" that starts with ''
  const incrIdx = rows.findIndex(r => String(r[0]).toLowerCase().includes('2026 incremental'));
  if (incrIdx >= 0 && rows[incrIdx + 1]) {
    const cumulRow = rows[incrIdx + 1];
    if (typeof cumulRow[MONTH_COL_OFFSET + 1] === 'number') {
      for (let i = 0; i < periods.length; i++) {
        const amount = toFloat(cumulRow[i + MONTH_COL_OFFSET]);
        if (amount == null) continue;
        if (!dryRun) {
          await prisma.target.upsert({
            where: { period_type: { period: periods[i], type: 'FRONTBOOK_NR_CUMUL' as any } },
            create: { period: periods[i], type: 'FRONTBOOK_NR_CUMUL' as any, amount },
            update: { amount },
          });
        }
        upserted++;
      }
    }
  }

  // ─── TPV targets ──────────────────────────────────────────────────────────
  await upsertTargetRow('Run Rate monthly', 'TPV_RUN_RATE_MONTHLY');
  await upsertTargetRow('Annualised', 'TPV_ANNUALISED');

  // ─── Go-live targets ──────────────────────────────────────────────────────
  await upsertTargetRow('Gold', 'GO_LIVE_GOLD');
  await upsertTargetRow('Total Go-Lives', 'GO_LIVE_TOTAL');

  // ─── Backbook NR target ───────────────────────────────────────────────────
  // Find the Backbook NR section: row with label "NR target" after "Backbook NR"
  const bbSectionIdx = rows.findIndex(r => String(r[0]).toLowerCase().includes('backbook nr'));
  if (bbSectionIdx >= 0) {
    // Find next date row after bbSectionIdx
    for (let ri = bbSectionIdx; ri < Math.min(bbSectionIdx + 10, rows.length); ri++) {
      if (String(rows[ri][0]).toLowerCase().includes('nr target')) {
        const bbDateRowIdx = ri - 1;
        const bbPeriods: Date[] = [];
        for (let col = 1; col <= 13; col++) {
          const d = excelDateToJs(rows[bbDateRowIdx][col]);
          if (d) bbPeriods.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
        }
        const nrRow = rows[ri];
        for (let i = 0; i < bbPeriods.length; i++) {
          const amount = toFloat(nrRow[i + 1]);
          if (amount == null) continue;
          if (!dryRun) {
            await prisma.target.upsert({
              where: { period_type: { period: bbPeriods[i], type: 'BACKBOOK_NR' as any } },
              create: { period: bbPeriods[i], type: 'BACKBOOK_NR' as any, amount },
              update: { amount },
            });
          }
          upserted++;
        }
        break;
      }
    }
  }

  // ─── AM targets (per-account quarterly from "7. AM targets" sheet) ────────
  const amWs = wb.Sheets['7. AM targets'];
  if (amWs) {
    const amRaw = (require('xlsx') as typeof import('xlsx')).utils.sheet_to_json<(string | number)[]>(amWs, { header: 1, defval: '' });
    // Row 0: quarters (2026-Q1, 2026-Q1, 2026-Q2, ...)
    // Row 1: column labels (alias, target version, revenue target, PV target, ...)
    // Row 2+: data
    const quarterRow = amRaw[0] as string[];
    const labelRow = amRaw[1] as string[];
    // Build quarter list (deduplicated pairs)
    const quarters: { label: string; revenueCol: number; pvCol: number }[] = [];
    for (let col = 2; col < quarterRow.length; col += 2) {
      const q = String(quarterRow[col] ?? '').trim();
      if (q) quarters.push({ label: q, revenueCol: col, pvCol: col + 1 });
    }

    let amUpserted = 0;
    for (let ri = 2; ri < amRaw.length; ri++) {
      const row = amRaw[ri];
      const alias = String(row[0] ?? '').trim();
      const targetVersion = String(row[1] ?? '').trim();
      if (!alias) continue;

      const account = dryRun ? null : await prisma.account.findUnique({ where: { alias } });
      if (!account && !dryRun) continue;

      for (const q of quarters) {
        const revTarget = toFloat(row[q.revenueCol]);
        const pvTarget = toFloat(row[q.pvCol]);
        if (revTarget == null && pvTarget == null) continue;
        if (!dryRun && account) {
          await prisma.aMTarget.upsert({
            where: { accountId_quarter: { accountId: account.id, quarter: q.label } },
            create: { accountId: account.id, alias, quarter: q.label, targetVersion: targetVersion || null, revenueTarget: revTarget, pvTarget },
            update: { revenueTarget: revTarget ?? undefined, pvTarget: pvTarget ?? undefined, targetVersion: targetVersion || undefined },
          });
        }
        amUpserted++;
      }
    }
    console.log(`   ✓ AM targets: ${amUpserted} upserted`);
  }

  console.log(`   ✓ Targets: ${upserted} upserted`);
}
