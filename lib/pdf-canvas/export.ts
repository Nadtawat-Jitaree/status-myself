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
 * แปลงพิกัดจากหน้าจอ (Canvas Screen Space) ไปยังพิกัดของ PDF (PDF Page Space)
 * โดยคำนึงถึงการหมุนหน้ากระดาษ (Rotation: 0, 90, 180, 270 องศา)
 */
function transformPointToPdf(
  sx: number,
  sy: number,
  pageWidth: number,
  pageHeight: number,
  rotation: number = 0
): { x: number; y: number } {
  const rot = ((rotation % 360) + 360) % 360;
  if (rot === 90) {
    return { x: sy, y: sx };
  } else if (rot === 180) {
    return { x: pageWidth - sx, y: sy };
  } else if (rot === 270) {
    return { x: pageWidth - sy, y: pageHeight - sx };
  }
  // rot === 0 (default)
  return { x: sx, y: pageHeight - sy };
}

/**
 * คำนวณตำแหน่งและมุมหมุนสำหรับวางรูปภาพลงใน PDF ตามการหมุนหน้ากระดาษ
 */
function getImagePdfParams(
  img: { x: number; y: number; width: number; height: number },
  pageWidth: number,
  pageHeight: number,
  rotation: number = 0
): { x: number; y: number; width: number; height: number; rotate: number } {
  const rot = ((rotation % 360) + 360) % 360;
  if (rot === 90) {
    return {
      x: img.y + img.height,
      y: img.x,
      width: img.width,
      height: img.height,
      rotate: 90,
    };
  } else if (rot === 180) {
    return {
      x: pageWidth - img.x,
      y: img.y + img.height,
      width: img.width,
      height: img.height,
      rotate: 180,
    };
  } else if (rot === 270) {
    return {
      x: pageWidth - (img.y + img.height),
      y: pageHeight - img.x,
      width: img.width,
      height: img.height,
      rotate: 270,
    };
  }
  // rot === 0
  return {
    x: img.x,
    y: pageHeight - img.y - img.height,
    width: img.width,
    height: img.height,
    rotate: 0,
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
  const hasImportedPdfPages = pages.some((p) => !p.isCustomPage);
  let pdfDoc: PDFDocument;

  if (hasImportedPdfPages && originalPdfBytes && originalPdfBytes.byteLength > 0) {
    try {
      const clonedBytes =
        originalPdfBytes instanceof Uint8Array
          ? originalPdfBytes.slice(0)
          : new Uint8Array(originalPdfBytes.slice(0));
      const sourceDoc = await PDFDocument.load(clonedBytes, {
        ignoreEncryption: true,
      });
      pdfDoc = await PDFDocument.create();

      const sourcePages = sourceDoc.getPages();
      let importedPdfPageIndex = 0;

      for (let i = 0; i < pages.length; i++) {
        const pageState = pages[i];
        if (!pageState.isCustomPage && importedPdfPageIndex < sourcePages.length) {
          const [copiedPage] = await pdfDoc.copyPages(sourceDoc, [importedPdfPageIndex]);
          copiedPage.setSize(pageState.width, pageState.height);
          copiedPage.setRotation(degrees(pageState.rotation || 0));
          pdfDoc.addPage(copiedPage);
          importedPdfPageIndex++;
        } else {
          // หน้ากระดาษสร้างเอง (Custom Page) ให้สร้างเป็นหน้าใหม่สะอาดเสมอ
          const newPage = pdfDoc.addPage([pageState.width, pageState.height]);
          newPage.setRotation(degrees(pageState.rotation || 0));
        }
      }
    } catch (e) {
      console.warn('PDF load warning, creating fresh PDF doc:', e);
      pdfDoc = await PDFDocument.create();
      for (let i = 0; i < pages.length; i++) {
        const pageState = pages[i];
        const newPage = pdfDoc.addPage([pageState.width, pageState.height]);
        newPage.setRotation(degrees(pageState.rotation || 0));
      }
    }
  } else {
    // ไม่มีหน้าจาก PDF ต้นฉบับ (เช่น สมุดจดดิจิทัล / หน้า custom ทั้งหมด)
    // สร้าง PDF ใหม่เอี่ยม ปราศจากลายเส้นเก่าที่อาจค้างอยู่ใน buffer เดิม
    pdfDoc = await PDFDocument.create();
    for (let i = 0; i < pages.length; i++) {
      const pageState = pages[i];
      const newPage = pdfDoc.addPage([pageState.width, pageState.height]);
      newPage.setRotation(degrees(pageState.rotation || 0));
    }
  }

  const existingPages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const pageState = pages[i];
    let page = existingPages[i];
    if (!page) continue;

    const { width: pWidth, height: pHeight } = page.getSize();

    // คำนวณขนาดการแสดงผลบนหน้าจอ (displayWidth x displayHeight) เพื่ออ้างอิงตำแหน่งเส้น/รูปภาพ
    const isRot90or270 = pageState.rotation === 90 || pageState.rotation === 270;
    const dispW = isRot90or270 ? pHeight : pWidth;
    const dispH = isRot90or270 ? pWidth : pHeight;

    // วาดลวดลายกระดาษ (ถ้าเป็นหน้ากระดาษแบบกำหนดเอง เช่น ruled, grid, dotted)
    if (pageState.isCustomPage && pageState.template && pageState.template !== 'blank') {
      if (pageState.template === 'ruled') {
        const lineSpacing = 32;
        const topMargin = 50;
        const lineCol = rgb(0.886, 0.91, 0.941); // slate-200
        for (let sy = topMargin; sy < dispH - 20; sy += lineSpacing) {
          const p1 = transformPointToPdf(30, sy, pWidth, pHeight, pageState.rotation);
          const p2 = transformPointToPdf(dispW - 30, sy, pWidth, pHeight, pageState.rotation);
          page.drawLine({
            start: { x: p1.x, y: p1.y },
            end: { x: p2.x, y: p2.y },
            thickness: 1,
            color: lineCol,
          });
        }
      } else if (pageState.template === 'grid') {
        const gridSize = 25;
        const lineCol = rgb(0.945, 0.961, 0.976); // slate-100
        for (let sx = gridSize; sx < dispW; sx += gridSize) {
          const p1 = transformPointToPdf(sx, 0, pWidth, pHeight, pageState.rotation);
          const p2 = transformPointToPdf(sx, dispH, pWidth, pHeight, pageState.rotation);
          page.drawLine({
            start: { x: p1.x, y: p1.y },
            end: { x: p2.x, y: p2.y },
            thickness: 1,
            color: lineCol,
          });
        }
        for (let sy = gridSize; sy < dispH; sy += gridSize) {
          const p1 = transformPointToPdf(0, sy, pWidth, pHeight, pageState.rotation);
          const p2 = transformPointToPdf(dispW, sy, pWidth, pHeight, pageState.rotation);
          page.drawLine({
            start: { x: p1.x, y: p1.y },
            end: { x: p2.x, y: p2.y },
            thickness: 1,
            color: lineCol,
          });
        }
      } else if (pageState.template === 'dotted') {
        const dotSpacing = 25;
        const dotCol = rgb(0.796, 0.835, 0.882); // slate-300
        for (let sx = dotSpacing; sx < dispW; sx += dotSpacing) {
          for (let sy = dotSpacing; sy < dispH; sy += dotSpacing) {
            const pt = transformPointToPdf(sx, sy, pWidth, pHeight, pageState.rotation);
            page.drawCircle({
              x: pt.x,
              y: pt.y,
              size: 1.2,
              color: dotCol,
            });
          }
        }
      }
    }

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
        const imgParams = getImagePdfParams(imgEl, pWidth, pHeight, pageState.rotation);
        page.drawImage(pdfImg, {
          x: imgParams.x,
          y: imgParams.y,
          width: imgParams.width,
          height: imgParams.height,
          rotate: degrees(imgParams.rotate),
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
        const pt = transformPointToPdf(pts[0].x, pts[0].y, pWidth, pHeight, pageState.rotation);
        page.drawCircle({
          x: pt.x,
          y: pt.y,
          size: stroke.width / 2,
          color: strokeColor,
          opacity: strokeOpacity,
        });
        continue;
      }

      // วาดเส้นต่อเนื่องแบบเวกเตอร์คมชัดสูง
      for (let j = 0; j < pts.length - 1; j++) {
        const p1 = transformPointToPdf(pts[j].x, pts[j].y, pWidth, pHeight, pageState.rotation);
        const p2 = transformPointToPdf(pts[j + 1].x, pts[j + 1].y, pWidth, pHeight, pageState.rotation);

        page.drawLine({
          start: { x: p1.x, y: p1.y },
          end: { x: p2.x, y: p2.y },
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
