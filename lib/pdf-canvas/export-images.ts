import JSZip from 'jszip';
import { PageState, Stroke, ImageElement } from './types';
import { renderStroke, drawPaperPattern } from './algorithms';

/**
 * โหลด Image จาก DataUrl เป็น HTMLImageElement
 */
function loadImageAsync(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * ดาวน์โหลด Blob ออกมาเป็นไฟล์ลงเครื่องของผู้ใช้
 */
export function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * เรนเดอร์ 1 หน้า (Background PDF/Template + Images + Strokes) ลงบน Canvas เสมือน
 * คืนค่าเป็น Blob (image/png หรือ image/jpeg) โดยอิงตามแนวตั้ง/แนวนอน และการหมุน (Rotation)
 */
export async function renderPageToImageBlob(
  pageIndex: number,
  pages: PageState[],
  strokes: Stroke[],
  images: ImageElement[],
  pdfDocProxy: any | null,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 0.92,
  exportScale: number = 2.0 // 2x เพื่อความคมชัดสูง
): Promise<Blob> {
  const pageState = pages[pageIndex];
  if (!pageState) {
    throw new Error(`ไม่พบข้อมูลหน้าที่ ${pageIndex + 1}`);
  }

  // คำนวณขนาดที่แสดงผลจริงตามการหมุน 90 หรือ 270 องศา
  const isRotated90or270 = pageState.rotation === 90 || pageState.rotation === 270;
  const displayWidth = isRotated90or270 ? pageState.height : pageState.width;
  const displayHeight = isRotated90or270 ? pageState.width : pageState.height;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(displayWidth * exportScale);
  canvas.height = Math.round(displayHeight * exportScale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('ไม่สามารถสร้าง 2D Context สำหรับ Export รูปภาพได้');
  }

  // 1. พื้นหลังสีขาว
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.scale(exportScale, exportScale);

  // 2. เรนเดอร์ Background (PDF หรือ Paper Template)
  if (pdfDocProxy && !pageState.isCustomPage) {
    try {
      const pageNum = pageIndex + 1;
      const pdfPage = await pdfDocProxy.getPage(pageNum);
      const viewport = pdfPage.getViewport({
        scale: exportScale,
        rotation: (pdfPage.rotate + (pageState.rotation || 0)) % 360,
      });

      // ต้อง restore context scale ก่อนส่งให้ PDF.js วาด viewport scale
      ctx.restore();
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };
      await pdfPage.render(renderContext).promise;
      ctx.save();
      ctx.scale(exportScale, exportScale);
    } catch (e) {
      console.warn('PDF page render in export warning, fallback to template:', e);
      drawPaperPattern(ctx, displayWidth, displayHeight, pageState.template, 1);
    }
  } else {
    drawPaperPattern(ctx, displayWidth, displayHeight, pageState.template, 1);
  }

  // 3. วาด Images ของหน้านี้
  const pageImages = images.filter((img) => img.pageIndex === pageIndex);
  for (const imgEl of pageImages) {
    try {
      const imgDom = await loadImageAsync(imgEl.dataUrl);
      ctx.drawImage(imgDom, imgEl.x, imgEl.y, imgEl.width, imgEl.height);
    } catch (err) {
      console.warn('Failed to draw image during export:', err);
    }
  }

  // 4. วาด Strokes ของหน้านี้
  const pageStrokes = strokes.filter((s) => s.pageIndex === pageIndex);
  for (const stroke of pageStrokes) {
    renderStroke(ctx, stroke, 1);
  }

  ctx.restore();

  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob failed'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * ส่งออกหน้าปัจจุบันเป็นรูปภาพ (PNG / JPEG)
 */
export async function exportCurrentPageAsImage(
  pageIndex: number,
  pages: PageState[],
  strokes: Stroke[],
  images: ImageElement[],
  pdfDocProxy: any | null,
  format: 'png' | 'jpeg',
  baseName: string
) {
  const blob = await renderPageToImageBlob(
    pageIndex,
    pages,
    strokes,
    images,
    pdfDocProxy,
    format
  );
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const fileName = `${baseName}_p${pageIndex + 1}.${ext}`;
  triggerFileDownload(blob, fileName);
}

/**
 * ส่งออกทุกหน้าเป็นรูปภาพ (PNG / JPEG)
 * - PC: รวมไฟล์ทุกหน้าเป็น 1 ไฟล์ .zip ผ่าน JSZip
 * - Mobile: ดาวน์โหลดแยกทีละไฟล์เรียงกัน โดยมี delay เล็กน้อย
 */
export async function exportAllPagesAsImages(
  pages: PageState[],
  strokes: Stroke[],
  images: ImageElement[],
  pdfDocProxy: any | null,
  format: 'png' | 'jpeg',
  baseName: string,
  isMobile: boolean,
  onProgress?: (current: number, total: number) => void
) {
  const total = pages.length;
  const ext = format === 'jpeg' ? 'jpg' : 'png';

  if (isMobile) {
    // โหมด Mobile: โหลดทีละรูปเรียงกัน
    for (let i = 0; i < total; i++) {
      if (onProgress) onProgress(i + 1, total);
      const blob = await renderPageToImageBlob(
        i,
        pages,
        strokes,
        images,
        pdfDocProxy,
        format
      );
      const fileName = `${baseName}_p${i + 1}.${ext}`;
      triggerFileDownload(blob, fileName);

      // หน่วงเวลาเล็กน้อยเพื่อป้องกัน Browser mobile ตัด queue การ download
      if (i < total - 1) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  } else {
    // โหมด PC: รวบรวมทุกรูปแล้วสร้าง Zip
    const zip = new JSZip();

    for (let i = 0; i < total; i++) {
      if (onProgress) onProgress(i + 1, total);
      const blob = await renderPageToImageBlob(
        i,
        pages,
        strokes,
        images,
        pdfDocProxy,
        format
      );
      const fileName = `${baseName}_p${i + 1}.${ext}`;
      zip.file(fileName, blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    triggerFileDownload(zipBlob, `${baseName}_pages_${ext}.zip`);
  }
}
