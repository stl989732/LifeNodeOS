import { newTableRowId, type TrackerTableRow } from "./tableRows";

const EUR_TO_USD = 1.08;

function parseSingleAmount(text: string): number | null {
  const cleaned = text.replace(/,/g, "");
  const usd = cleaned.match(/\$\s*([\d.]+)/);
  if (usd) return Number.parseFloat(usd[1]);
  const eur = cleaned.match(/€\s*([\d.]+)/);
  if (eur) return Number.parseFloat(eur[1]) * EUR_TO_USD;
  const plain = cleaned.match(/([\d.]+)\s*usd/i);
  if (plain) return Number.parseFloat(plain[1]);
  return null;
}

/** Parse USD/EUR amount strings like "$1,200–$1,600" or "$900". */
export function parseUsdAmountRange(text: string): { low: number; high: number } | null {
  if (!text?.trim()) return null;
  const t = text.trim();
  if (/total|estimated spend/i.test(t)) return null;

  const range = t.match(
    /[$€]\s*([\d,]+(?:\.\d+)?)\s*[–\-—to]+\s*[$€]?\s*([\d,]+(?:\.\d+)?)/i,
  );
  if (range) {
    const low = Number.parseFloat(range[1].replace(/,/g, ""));
    const high = Number.parseFloat(range[2].replace(/,/g, ""));
    if (t.includes("€") && !t.includes("$")) {
      return { low: low * EUR_TO_USD, high: high * EUR_TO_USD };
    }
    if (Number.isFinite(low) && Number.isFinite(high)) return { low, high };
  }

  const nightly = t.match(/[$€]\s*([\d,]+(?:\.\d+)?)\s*\/\s*night/i);
  if (nightly) {
    const perNight = Number.parseFloat(nightly[1].replace(/,/g, ""));
    const nightsMatch = t.match(/×\s*(\d+)\s*nights?/i);
    const nights = nightsMatch ? Number.parseInt(nightsMatch[1], 10) : 1;
    const total = perNight * nights;
    const val = t.includes("€") ? total * EUR_TO_USD : total;
    return { low: val, high: val };
  }

  const single = parseSingleAmount(t);
  if (single !== null && Number.isFinite(single)) {
    return { low: single, high: single };
  }

  return null;
}

export function formatTotalRange(low: number, high: number): string {
  const fmt = (n: number) =>
    `$${Math.round(n).toLocaleString("en-US")}`;
  if (Math.abs(low - high) < 1) {
    return `${fmt(low)} USD (estimated total)`;
  }
  return `${fmt(low)}–${fmt(high)} USD (estimated total)`;
}

function isTotalRow(row: TrackerTableRow): boolean {
  const item = row.cells.Item ?? row.cells.item ?? "";
  return /^total|grand total|estimated total/i.test(item.trim());
}

function amountColumnKey(columns: string[]): string | null {
  return (
    columns.find((c) => /^amount$/i.test(c)) ??
    columns.find((c) => /^budget$/i.test(c)) ??
    null
  );
}

/** Sum Amount column and append a Total row when missing. */
export function appendTravelTotalRow(
  rows: TrackerTableRow[],
  columns: string[],
): TrackerTableRow[] {
  if (rows.some(isTotalRow)) return rows;

  const amountCol = amountColumnKey(columns);
  if (!amountCol) return rows;

  let lowSum = 0;
  let highSum = 0;
  let found = 0;

  for (const row of rows) {
    const parsed = parseUsdAmountRange(row.cells[amountCol] ?? "");
    if (!parsed) continue;
    lowSum += parsed.low;
    highSum += parsed.high;
    found++;
  }

  if (found === 0) return rows;

  const itemCol = columns.find((c) => /^item$/i.test(c)) ?? columns[0];
  const destCol =
    columns.find((c) => /destination|cost/i.test(c)) ?? columns[1] ?? columns[0];
  const notesCol = columns.find((c) => /^notes$/i.test(c));

  const cells: Record<string, string> = {};
  for (const col of columns) cells[col] = "";

  cells[itemCol] = "Total estimated spend";
  cells[destCol] = "All line items above";
  cells[amountCol] = formatTotalRange(lowSum, highSum);
  if (notesCol) {
    cells[notesCol] =
      "Sum of parsed amounts above. Edit individual rows to update this total.";
  }

  return [...rows, { id: newTableRowId(), cells }];
}
