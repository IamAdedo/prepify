import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface PdfOptions {
  fileName: string;
  // When set, a diagonal repeating watermark is drawn across every page.
  watermark?: string;
}

// Render a DOM element to a multi-page A4 PDF document (shared core used by both
// the download and the "attach to email" paths).
async function renderElementToPdf(el: HTMLElement, watermark?: string): Promise<jsPDF> {
  // A full answer review can be extremely tall (180 questions). html2canvas
  // renders to a single canvas, and browsers cap canvas dimensions/area — at
  // scale 2 a long review overflows that cap and comes back blank/truncated.
  // Derive a safe scale so the canvas always stays within limits, only dropping
  // below 2 when the element is genuinely too large.
  const MAX_DIM = 16000; // px — below Chrome/Firefox's ~16384 per-axis limit
  const MAX_AREA = 240_000_000; // px² — conservative total-area ceiling
  const width = el.scrollWidth || el.offsetWidth || 800;
  const height = el.scrollHeight || el.offsetHeight || 1000;
  const scale = Math.max(
    1,
    Math.min(
      2,
      MAX_DIM / width,
      MAX_DIM / height,
      Math.sqrt(MAX_AREA / (width * height))
    )
  );

  const canvas = await html2canvas(el, {
    scale,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const imgData = canvas.toDataURL("image/png");

  // How many A4 pages the rendered image spans.
  const totalPages = Math.max(1, Math.ceil(imgHeight / pageHeight));

  let position = 0;
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    if (watermark) drawWatermark(pdf, watermark, pageWidth, pageHeight);
    // Number multi-page documents (e.g. the answer review). A single-page slip
    // stays clean with no footer.
    if (totalPages > 1) {
      drawPageNumber(pdf, pageIndex + 1, totalPages, pageWidth, pageHeight);
    }
    position -= pageHeight;
  }

  return pdf;
}

// Render a DOM element to a multi-page A4 PDF and trigger a download.
export async function exportElementToPdf(el: HTMLElement, opts: PdfOptions): Promise<void> {
  const pdf = await renderElementToPdf(el, opts.watermark);
  pdf.save(opts.fileName);
}

// Render a DOM element to a PDF and return its raw base64 (no data-URI prefix),
// suitable for sending as an email attachment payload.
export async function renderElementToPdfBase64(
  el: HTMLElement,
  watermark?: string
): Promise<string> {
  const pdf = await renderElementToPdf(el, watermark);
  // 'datauristring' → "data:application/pdf;filename=...;base64,JVBERi0x..."
  const dataUri = pdf.output("datauristring");
  const base64 = dataUri.substring(dataUri.indexOf(",") + 1);
  return base64;
}

// Small centered "Page X of Y" footer, drawn over a faint white strip so it
// stays legible even when it lands on top of exported content.
function drawPageNumber(
  pdf: jsPDF,
  page: number,
  total: number,
  pageWidth: number,
  pageHeight: number
) {
  const label = `Page ${page} of ${total}`;
  const y = pageHeight - 6;
  pdf.saveGraphicsState();
  // Faint backing strip so the label reads on any background.
  // @ts-ignore - GState is available at runtime in jsPDF.
  pdf.setGState(new (pdf as any).GState({ opacity: 0.85 }));
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, pageHeight - 10, pageWidth, 10, "F");
  pdf.restoreGraphicsState();

  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text(label, pageWidth / 2, y, { align: "center" });
}

// Repeating diagonal watermark tiled across the page. Tile spacing is derived
// from the actual rendered text width so long candidate names never overlap.
function drawWatermark(pdf: jsPDF, text: string, pageWidth: number, pageHeight: number) {
  pdf.saveGraphicsState();
  // @ts-ignore - GState is available at runtime in jsPDF.
  pdf.setGState(new (pdf as any).GState({ opacity: 0.06 }));
  pdf.setTextColor(10, 54, 157); // brand blue
  pdf.setFontSize(13);

  const angle = 30;
  const rad = (angle * Math.PI) / 180;

  // Measure the string at the current font size and size the tiles around its
  // rotated footprint, with generous padding so rows/columns stay well spaced.
  const textWidth = pdf.getTextWidth(text);
  const stepX = textWidth * Math.cos(rad) + 40;
  const stepY = textWidth * Math.sin(rad) + 55;

  for (let y = 0; y < pageHeight + stepY; y += stepY) {
    for (let x = -stepX; x < pageWidth + stepX; x += stepX) {
      pdf.text(text, x, y, { angle });
    }
  }
  pdf.restoreGraphicsState();
}
