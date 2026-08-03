import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface PdfOptions {
  fileName: string;
  // When set, a diagonal repeating watermark is drawn across every page.
  watermark?: string;
}

// Render a DOM element to a multi-page A4 PDF and trigger a download.
export async function exportElementToPdf(el: HTMLElement, opts: PdfOptions): Promise<void> {
  const canvas = await html2canvas(el, {
    scale: 2,
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

  let heightLeft = imgHeight;
  let position = 0;
  let pageIndex = 0;

  while (heightLeft > 0) {
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    if (opts.watermark) drawWatermark(pdf, opts.watermark, pageWidth, pageHeight);
    heightLeft -= pageHeight;
    position -= pageHeight;
    pageIndex += 1;
  }

  pdf.save(opts.fileName);
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
