export type InvoiceLineUnit = "currency" | "hours" | "days";

export function lineUnitForDescription(description: string): InvoiceLineUnit {
  const d = description.trim().toLowerCase();
  if (d === "hours billed" || d.includes("hour")) return "hours";
  if (d === "days worked" || d.includes("day worked")) return "days";
  return "currency";
}

export function countsTowardInvoiceTotal(unit: InvoiceLineUnit): boolean {
  return unit === "currency";
}

type InvoiceLineLike = {
  description: string;
  amount: number;
  unit?: InvoiceLineUnit;
};

/** Sum only currency line items — excludes hours, days, and quantity-style rows. */
export function invoiceCurrencyTotal(lines: InvoiceLineLike[]): number {
  return lines.reduce((sum, line) => {
    const unit = line.unit ?? lineUnitForDescription(line.description);
    return countsTowardInvoiceTotal(unit) ? sum + line.amount : sum;
  }, 0);
}

export function formatInvoiceLineAmount(
  description: string,
  amount: number,
  unit?: InvoiceLineUnit,
): string {
  const u = unit ?? lineUnitForDescription(description);
  if (u === "hours") {
    const n = Number.isFinite(amount) ? amount : 0;
    return n === 1 ? "1 hr" : `${n} hrs`;
  }
  if (u === "days") {
    const n = Number.isFinite(amount) ? amount : 0;
    return n === 1 ? "1 day" : `${n} days`;
  }
  return `$${amount.toFixed(2)}`;
}
