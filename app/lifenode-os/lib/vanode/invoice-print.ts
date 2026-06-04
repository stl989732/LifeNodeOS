import type { Invoice } from "./types";
import {
  countsTowardInvoiceTotal,
  formatInvoiceLineAmount,
  lineUnitForDescription,
} from "./invoice-lines";

const SIG_FONT =
  '"Brush Script MT", "Segoe Script", "Apple Chancery", "Snell Roundhand", cursive';

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Safe for text nodes; newlines become <br>. */
function escapeMultiline(s: string) {
  return escapeHtml(s).replace(/\n/g, "<br />");
}

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function buildInvoicePrintHtml(inv: Invoice): string {
  const total = inv.lineItems.reduce((s, l) => {
    const u = l.unit ?? lineUnitForDescription(l.description);
    return countsTowardInvoiceTotal(u) ? s + l.amount : s;
  }, 0);
  const rows = inv.lineItems
    .map((l) => {
      const u = l.unit ?? lineUnitForDescription(l.description);
      const amt = formatInvoiceLineAmount(l.description, l.amount, u);
      return `<tr><td class="desc">${escapeMultiline(l.description)}</td><td class="amt">${escapeHtml(amt)}</td></tr>`;
    })
    .join("");

  const biz = inv.businessAgencyName?.trim();
  const owner = inv.ownerFullName?.trim();
  const sigMode = inv.signatureMode ?? "type";
  const sigTyped = inv.signatureTypedName?.trim();
  const sigImg = inv.signatureImageDataUrl?.trim();
  const sigRole = inv.signatureDesignation?.trim();

  let signatureBlock = `<p class="sig-empty">No signature provided.</p>`;
  if (sigMode === "upload" && sigImg) {
    signatureBlock = `<img class="sig-img" src="${escapeAttr(sigImg)}" alt="Signature" />`;
  } else if (sigTyped) {
    signatureBlock = `<p class="sig-typed">${escapeHtml(sigTyped)}</p>`;
  }
  if (sigRole) {
    signatureBlock += `<p class="sig-role">${escapeHtml(sigRole)}</p>`;
  }

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Invoice ${escapeHtml(inv.id.slice(0, 8))}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 48px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; color: #0f172a; background: #fff; }
  .card { max-width: 720px; margin: 0 auto; padding: 24px; border: 1px solid rgba(45, 212, 191, 0.45); border-radius: 16px; background: #fff; }
  .badge { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #0f766e; margin: 0 0 8px; }
  h1 { font-size: 28px; margin: 0 0 4px; font-weight: 800; }
  .biz { font-size: 14px; font-weight: 700; margin: 4px 0 0; }
  .owner { font-size: 14px; color: #475569; margin: 2px 0 0; }
  .meta { margin-top: 12px; font-size: 14px; color: #475569; line-height: 1.5; }
  .meta strong { color: #0f172a; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; }
  th { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding: 10px 8px; }
  th:last-child { text-align: right; }
  td { border-bottom: 1px solid #f1f5f9; padding: 12px 8px; vertical-align: top; }
  td.desc { color: #1e293b; white-space: normal; }
  td.amt { text-align: right; font-variant-numeric: tabular-nums; font-family: ui-monospace, monospace; font-weight: 600; }
  .sig-head { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
  .sig-typed { margin: 8px 0 0; font-size: 28px; color: #0f172a; font-family: ${SIG_FONT}; }
  .sig-img { margin-top: 8px; max-height: 80px; object-fit: contain; display: block; }
  .sig-empty { margin: 8px 0 0; font-size: 12px; color: #94a3b8; }
  .sig-role { margin: 6px 0 0; font-size: 13px; color: #475569; font-weight: 600; }
  .total { margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(45, 212, 191, 0.35); text-align: right; font-size: 20px; font-weight: 800; color: #134e4a; }
  .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; }
  @media print {
    body { padding: 24px; }
    .card { border: none; max-width: none; }
  }
</style></head><body>
  <div class="card">
    <p class="badge">Preview</p>
    <h1>Invoice</h1>
    ${biz ? `<p class="biz">${escapeHtml(biz)}</p>` : ""}
    ${owner ? `<p class="owner">${escapeHtml(owner)}</p>` : ""}
    ${sigRole && owner ? `<p class="sig-role">${escapeHtml(sigRole)}</p>` : ""}
    <div class="meta">
      <div><strong>Bill to:</strong> ${escapeHtml(inv.clientName)}</div>
      <div><strong>Due:</strong> ${escapeHtml(inv.dueDate)}</div>
    </div>
    <table>
      <thead><tr><th>Description</th><th>Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="sig-head">Signature</div>
    ${signatureBlock}
    <div class="total">Total $${total.toFixed(2)}</div>
    <p class="footer">Generated by LifeNode OS · VANode invoicing</p>
  </div>
</body></html>`;
}

/**
 * Opens a dedicated tab with the invoice, then the system print / Save as PDF dialog.
 * Uses a blob URL (not `noopener` on `about:blank`) so the document is writable in all modern browsers.
 */
export function openInvoicePrint(inv: Invoice) {
  const html = buildInvoicePrintHtml(inv);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    URL.revokeObjectURL(url);
    return;
  }

  const finish = () => {
    URL.revokeObjectURL(url);
  };

  let printed = false;
  const oncePrint = () => {
    if (printed) return;
    printed = true;
    try {
      w.focus();
      w.print();
    } catch {
      /* ignore */
    }
    w.addEventListener("afterprint", finish, { once: true });
    window.setTimeout(finish, 120_000);
  };

  w.addEventListener(
    "load",
    () => window.setTimeout(oncePrint, 120),
    { once: true },
  );
  window.setTimeout(oncePrint, 700);
}
