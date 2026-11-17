import { PDFDocument, rgb, degrees, LineCapStyle } from 'pdf-lib';
import { Stroke, PageState, ImageElement } from './types';

// Helper แปลง hex color (#rrggbb หรือ #rgb) เป็น {r, g, b} ในช่วง 0..1
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/**
 * สร้างไฟล์ PDF ใหม่ หรือนำ PDF เดิมมาใส่เวกเตอร์เส้นวาด ลวดลายกระดาษ และปรับการหมุน/การวางแนว
 */
export async function exportAnnotatedPdfBlob(
  originalPdfBytes: ArrayBuffer | Uint8Array | null,
  pages: PageState[],
  strokes: Stroke[],
  images: ImageElement[] = []
): Promise<Blob> {
  let pdfDoc: PDFDocument;

  if (originalPdfBytes && originalPdfBytes.byteLength > 0) {
    try {
      const clonedBytes =
        originalPdfBytes instanceof Uint8Array
          ? originalPdfBytes.slice(0)
          : new Uint8Array(originalPdfBytes.slice(0));
      pdfDoc = await PDFDocument.load(clonedBytes, {
        ignoreEncryption: true,
      });
    } catch (e) {
      console.warn('PDF load warning, creating fresh PDF doc:', e);
      pdfDoc = await PDFDocument.create();
    }
  } else {
    pdfDoc = await PDFDocument.create();
  }

  const existingPages = pdfDoc.getPages();

  // สร้างหน้าใหม่ถ้ามีหน้าที่ผู้ใช้เพิ่มเอง (เช่น หน้าที่ 2, 3...)
  for (let i = 0; i < pages.length; i++) {
    const pageState = pages[i];
    let page = existingPages[i];

    if (!page) {
      // หน้าใหม่
      page = pdfDoc.addPage([pageState.width, pageState.height]);
    } else if (pageState.isCustomPage) {
      page.setSize(pageState.width, pageState.height);
    }

    // ปรับการหมุนเฉพาะหน้า custom หรือเมื่อมีการหมุนเพิ่มเติม
    if (pageState.isCustomPage && pageState.rotation !== undefined) {
      page.setRotation(degrees(pageState.rotation));
    }

    const { width: pWidth, height: pHeight } = page.getSize();

    // วาดรูปภาพ (Images) ของหน้านี้ก่อน เพื่อให้เส้นวาดอยู่เหนือรูป
    const pageImages = images.filter((img) => img.pageIndex === i);
    for (const imgEl of pageImages) {
      try {
        let pdfImg;
        if (imgEl.dataUrl.startsWith('data:image/png')) {
          pdfImg = await pdfDoc.embedPng(imgEl.dataUrl);
        } else {
          pdfImg = await pdfDoc.embedJpg(imgEl.dataUrl);
        }
        page.drawImage(pdfImg, {
          x: imgEl.x,
          y: pHeight - imgEl.y - imgEl.height,
          width: imgEl.width,
          height: imgEl.height,
        });
      } catch (err) {
        console.warn('Embedding image in PDF skipped or failed:', err);
      }
    }

    // วาด Strokes ของหน้านี้
    const pageStrokes = strokes.filter((s) => s.pageIndex === i);

    for (const stroke of pageStrokes) {
      const { r, g, b } = hexToRgb(stroke.color);
      const strokeColor = rgb(r, g, b);
      const strokeOpacity =
        stroke.tool === 'highlighter' ? stroke.opacity || 0.35 : stroke.opacity || 1.0;

      const pts = stroke.points;
      if (pts.length === 0) continue;

      if (pts.length === 1) {
        // วาดจุดเดี่ยว (Circle)
        page.drawCircle({
          x: pts[0].x,
          y: pHeight - pts[0].y,
          size: stroke.width / 2,
          color: strokeColor,
          opacity: strokeOpacity,
        });
        continue;
      }

      // วาดเส้นต่อเนื่องแบบเวกเตอร์คมชัดสูง
      // เพื่อความลื่นไหล เรา interpolate จุดระหว่างจุดถ้าห่างกัน
      for (let j = 0; j < pts.length - 1; j++) {
        const p1 = pts[j];
        const p2 = pts[j + 1];

        // ใน PDF แกน Y เริ่มต้นจากล่างขึ้นบน ต่างจาก Canvas ที่เริ่มจากบนลงล่าง
        const y1 = pHeight - p1.y;
        const y2 = pHeight - p2.y;

        page.drawLine({
          start: { x: p1.x, y: y1 },
          end: { x: p2.x, y: y2 },
          thickness: stroke.width,
          color: strokeColor,
          opacity: strokeOpacity,
          lineCap: LineCapStyle.Round,
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}
