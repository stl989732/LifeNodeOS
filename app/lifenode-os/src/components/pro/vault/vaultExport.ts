import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  Document as DocxDocument,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

export async function exportVaultPdf(container: HTMLElement | null) {
  if (!container) throw new Error("Editor surface not ready.");
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 40;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(
    (pageW - margin * 2) / canvas.width,
    (pageH - margin * 2) / canvas.height,
  );
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  pdf.addImage(img, "PNG", margin, margin, w, h);
  pdf.save("pronode-vault.pdf");
}

/** Best-effort HTML → .docx for client-side export. */
export async function exportVaultDocxFromHtml(
  html: string,
  filename = "pronode-vault.docx",
) {
  const parser = new DOMParser();
  const dom = parser.parseFromString(html, "text/html");
  const children: Paragraph[] = [];

  const blockSel = "h1, h2, h3, p";
  dom.body.querySelectorAll(blockSel).forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || "").replace(/\s+/g, " ").trim() || " ";
    if (tag === "h1") {
      children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_1 }));
    } else if (tag === "h2") {
      children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_2 }));
    } else if (tag === "h3") {
      children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_3 }));
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text })],
        }),
      );
    }
  });

  if (children.length === 0) {
    children.push(new Paragraph({ children: [new TextRun(" ")] }));
  }

  const doc = new DocxDocument({
    sections: [{ properties: {}, children }],
  });
  const blob = await Packer.toBlob(doc);
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
