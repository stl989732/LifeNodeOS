import type { Invoice } from "./types";
import { invoiceCurrencyTotal } from "./invoice-lines";

export function buildInvoiceShareText(inv: Pick<
  Invoice,
  "clientName" | "dueDate" | "lineItems" | "businessAgencyName" | "ownerFullName"
>): string {
  const total = invoiceCurrencyTotal(inv.lineItems);
  const lines = [
    `Invoice for ${inv.clientName}`,
    inv.businessAgencyName?.trim()
      ? `From: ${inv.businessAgencyName.trim()}`
      : null,
    inv.ownerFullName?.trim() ? `Billed by: ${inv.ownerFullName.trim()}` : null,
    `Due: ${inv.dueDate}`,
    `Total: $${total.toFixed(2)} USD`,
    "",
    "Sent via LifeNode OS · VANode",
  ].filter(Boolean);
  return lines.join("\n");
}

export function invoiceShareLinks(text: string) {
  const encoded = encodeURIComponent(text);
  return {
    email: `mailto:?subject=${encodeURIComponent("Invoice")}&body=${encoded}`,
    whatsapp: `https://wa.me/?text=${encoded}`,
    messenger: `https://m.me/share/?link=${encoded}`,
  };
}
