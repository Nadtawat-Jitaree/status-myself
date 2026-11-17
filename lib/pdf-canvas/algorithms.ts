import { Point, Stroke, PaperTemplate, ImageElement } from './types';

/**
 * คำนวณ Bounding Box ของ Stroke เพื่อใช้คัดกรองการตรวจจับวัตถุ (Hit-testing) ได้อย่างรวดเร็ว
 */
export function calculateStrokeBBox(points: Point[], strokeWidth: number = 2) {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  const pad = strokeWidth / 2;

  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }

  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}

/**
 * คำนวณระยะห่างที่สั้นที่สุดจากจุด (px, py) ไปยังส่วนของเส้นตรงระหว่าง (x1, y1) และ (x2, y2)
 */
export function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    const distSq = (px - x1) * (px - x1) + (py - y1) * (py - y1);
    return Math.sqrt(distSq);
  }

  // Projection parameter t
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  const distX = px - projX;
  const distY = py - projY;

  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * อัลกอริทึม Stroke Eraser Hit-Test:
 * ตรวจสอบว่ารัศมีของยางลบชนเข้ากับเส้น Stroke ใดหรือไม่
 * ทำงาน 2 ระดับ: Broad Phase (BBox check) -> Narrow Phase (Segment distance check)
 */
export function isStrokeHitByEraser(
  stroke: Stroke,
  eraserPoint: Point,
  eraserRadius: number
): boolean {
  if (stroke.points.length === 0) return false;

  const pad = eraserRadius + stroke.width / 2;

  // 1. Broad Phase Check (Bounding Box)
  const bbox = stroke.bbox || calculateStrokeBBox(stroke.points, stroke.width);
  if (
    eraserPoint.x < bbox.minX - pad ||
    eraserPoint.x > bbox.maxX + pad ||
    eraserPoint.y < bbox.minY - pad ||
    eraserPoint.y > bbox.maxY + pad
  ) {
    return false;
  }

  // จุดเดียว
  if (stroke.points.length === 1) {
    const pt = stroke.points[0];
    const d = Math.hypot(eraserPoint.x - pt.x, eraserPoint.y - pt.y);
    return d <= pad;
  }

  // 2. Narrow Phase Check: ตรวจสอบแต่ละ Segment
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const p1 = stroke.points[i];
    const p2 = stroke.points[i + 1];

    const dist = pointToSegmentDistance(
      eraserPoint.x,
      eraserPoint.y,
      p1.x,
      p1.y,
      p2.x,
      p2.y
    );

    if (dist <= pad) {
      return true;
    }
  }

  return false;
}

/**
 * วาดเส้น Stroke ลงบน Canvas ด้วย Quadratic Bézier Spline เพื่อให้รอยต่อเส้นลื่นไหลเป็นธรรมชาติ
 */
export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  scale: number = 1
) {
  if (stroke.points.length === 0) return;

  ctx.save();
  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width * scale;

  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = stroke.opacity || 0.35;
  } else {
    ctx.globalAlpha = stroke.opacity || 1;
  }

  const pts = stroke.points;

  if (pts.length === 1) {
    ctx.arc(pts[0].x * scale, pts[0].y * scale, (stroke.width * scale) / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
    ctx.restore();
    return;
  }

  if (pts.length === 2) {
    ctx.moveTo(pts[0].x * scale, pts[0].y * scale);
    ctx.lineTo(pts[1].x * scale, pts[1].y * scale);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Quadratic Bezier Curve Smoothing using midpoints
  ctx.moveTo(pts[0].x * scale, pts[0].y * scale);

  for (let i = 1; i < pts.length - 1; i++) {
    const current = pts[i];
    const next = pts[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;

    ctx.quadraticCurveTo(
      current.x * scale,
      current.y * scale,
      midX * scale,
      midY * scale
    );
  }

  // ปลายเส้นสุดท้าย
  const last = pts[pts.length - 1];
  const secondLast = pts[pts.length - 2];
  ctx.quadraticCurveTo(
    secondLast.x * scale,
    secondLast.y * scale,
    last.x * scale,
    last.y * scale
  );

  ctx.stroke();
  ctx.restore();
}

/**
 * วาดลวดลายของกระดาษ (Paper Template): เส้นบรรทัด (Ruled), ตาราง (Grid), จุดไข่ปลา (Dotted)
 */
export function drawPaperPattern(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  template: PaperTemplate,
  scale: number = 1
) {
  if (template === 'blank') return;

  ctx.save();
  const scaledW = width * scale;
  const scaledH = height * scale;

  if (template === 'ruled') {
    const lineSpacing = 32 * scale;
    const topMargin = 50 * scale;
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 1 * scale;

    for (let y = topMargin; y < scaledH - 20 * scale; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(30 * scale, y);
      ctx.lineTo(scaledW - 30 * scale, y);
      ctx.stroke();
    }
  } else if (template === 'grid') {
    const gridSize = 25 * scale;
    ctx.strokeStyle = '#f1f5f9'; // slate-100
    ctx.lineWidth = 1 * scale;

    for (let x = gridSize; x < scaledW; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, scaledH);
      ctx.stroke();
    }
    for (let y = gridSize; y < scaledH; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(scaledW, y);
      ctx.stroke();
    }
  } else if (template === 'dotted') {
    const dotSpacing = 25 * scale;
    ctx.fillStyle = '#cbd5e1'; // slate-300
    const dotRadius = 1.2 * scale;

    for (let x = dotSpacing; x < scaledW; x += dotSpacing) {
      for (let y = dotSpacing; y < scaledH; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

/**
 * แปลงชุด Strokes เป็น SVG Path Data สำหรับ Export ลงใน PDF ผ่าน pdf-lib
 */
export function strokeToSvgPath(stroke: Stroke): string {
  const pts = stroke.points;
  if (pts.length === 0) return '';
  if (pts.length === 1) {
    return `M ${pts[0].x} ${pts[0].y} l 0.1 0.1`;
  }

  let path = `M ${pts[0].x} ${pts[0].y}`;

  if (pts.length === 2) {
    path += ` L ${pts[1].x} ${pts[1].y}`;
    return path;
  }

  for (let i = 1; i < pts.length - 1; i++) {
    const current = pts[i];
    const next = pts[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }

  const last = pts[pts.length - 1];
  const secondLast = pts[pts.length - 2];
  path += ` Q ${secondLast.x} ${secondLast.y} ${last.x} ${last.y}`;

  return path;
}

/**
 * ปรับลดขนาดและบีบอัดรูปภาพ (Client-side Image Optimization)
 * เพื่อป้องกัน Out-of-Memory บน Mobile / Capacitor
 */
export async function optimizeImageFile(
  file: File,
  maxDimension: number = 1800
): Promise<{ dataUrl: string; width: number; height: number; aspectRatio: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const aspectRatio = w / h;

        if (w > maxDimension || h > maxDimension) {
          if (w > h) {
            w = maxDimension;
            h = Math.round(maxDimension / aspectRatio);
          } else {
            h = maxDimension;
            w = Math.round(maxDimension * aspectRatio);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: e.target?.result as string,
            width: img.width,
            height: img.height,
            aspectRatio,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve({
          dataUrl,
          width: w,
          height: h,
          aspectRatio,
        });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * ตรวจสอบว่าจุดสัมผัส (Point) อยู่ภายในกรอบของรูปภาพหรือไม่
 */
export function isPointInImage(p: Point, img: ImageElement): boolean {
  return (
    p.x >= img.x &&
    p.x <= img.x + img.width &&
    p.y >= img.y &&
    p.y <= img.y + img.height
  );
}

/**
 * ตรวจสอบว่าจุดสัมผัสแตะโดนมุม Handle เพื่อย่อ/ขยายรูปภาพหรือไม่ (nw, ne, se, sw)
 */
export function getImageResizeHandle(
  p: Point,
  img: ImageElement,
  handleRadius: number = 14
): 'nw' | 'ne' | 'se' | 'sw' | null {
  const corners = [
    { handle: 'nw' as const, x: img.x, y: img.y },
    { handle: 'ne' as const, x: img.x + img.width, y: img.y },
    { handle: 'se' as const, x: img.x + img.width, y: img.y + img.height },
    { handle: 'sw' as const, x: img.x, y: img.y + img.height },
  ];

  for (const c of corners) {
    const dist = Math.hypot(p.x - c.x, p.y - c.y);
    if (dist <= handleRadius) {
      return c.handle;
    }
  }

  return null;
}

/**
 * ตรวจสอบว่าเส้น Stroke อยู่ภายในขอบเขตการวาดคลุม (Selection Rect) หรือไม่
 */
export function isStrokeInRect(
  stroke: Stroke,
  rect: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  if (stroke.points.length === 0) return false;
  const bbox = stroke.bbox || calculateStrokeBBox(stroke.points, stroke.width);
  if (
    bbox.maxX < rect.minX ||
    bbox.minX > rect.maxX ||
    bbox.maxY < rect.minY ||
    bbox.minY > rect.maxY
  ) {
    return false;
  }
  return stroke.points.some(
    (p) => p.x >= rect.minX && p.x <= rect.maxX && p.y >= rect.minY && p.y <= rect.maxY
  );
}

/**
 * ตรวจสอบว่ารูปภาพอยู่ในหรือตัดกับขอบเขตการวาดคลุม (Selection Rect) หรือไม่
 */
export function isImageInRect(
  img: ImageElement,
  rect: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  return !(
    img.x + img.width < rect.minX ||
    img.x > rect.maxX ||
    img.y + img.height < rect.minY ||
    img.y > rect.maxY
  );
}
