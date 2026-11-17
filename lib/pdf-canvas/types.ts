export type ToolType = 'pen' | 'highlighter' | 'eraser' | 'select' | 'pan';

export type PaperOrientation = 'portrait' | 'landscape';

export type PaperTemplate = 'blank' | 'ruled' | 'grid' | 'dotted';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface ImageElement {
  id: string;
  pageIndex: number;
  dataUrl: string; // Base64 data URL
  x: number;       // PDF point coordinates
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface Stroke {
  id: string;
  pageIndex: number;
  tool: 'pen' | 'highlighter';
  color: string;
  width: number;
  opacity: number;
  points: Point[];
  // Bounding box for fast hit-testing / culling in eraser
  bbox?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface PageState {
  pageIndex: number;
  rotation: number; // 0, 90, 180, 270
  orientation: PaperOrientation;
  width: number; // in PDF points (e.g. 595.28 for A4)
  height: number; // in PDF points (e.g. 841.89 for A4)
  template: PaperTemplate;
  isCustomPage?: boolean;
}

export interface DocumentAnnotationState {
  noteId?: string;
  pages: PageState[];
  strokes: Stroke[];
  images: ImageElement[];
  version: number;
}
