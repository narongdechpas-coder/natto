// Export a DOM node laid out at A4 size (794×1123 CSS px) to a one-page A4 portrait PDF.
// Libraries are loaded on demand so the main app bundle stays small.
export const A4_PX = { w: 794, h: 1123 };

export async function exportA4Pdf(node: HTMLElement, filename: string, title: string): Promise<void> {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  try { await document.fonts?.ready; } catch { /* ignore */ }
  const opts = { quality: 0.92, pixelRatio: 2, backgroundColor: '#ffffff', width: A4_PX.w, height: A4_PX.h, cacheBust: true };
  let dataUrl: string;
  try {
    dataUrl = await toJpeg(node, opts);
  } catch {
    // Web fonts can fail to embed (offline / blocked CDN) — fall back to the fonts already rendered by the browser.
    dataUrl = await toJpeg(node, { ...opts, skipFonts: true });
  }
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  pdf.setProperties({ title, subject: 'NATTO visit summary (DEMO DATA)', creator: 'NATTO demo' });
  pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297);
  pdf.save(filename);
}
