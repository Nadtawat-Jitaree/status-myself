"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  PenTool,
  Highlighter,
  Eraser,
  RotateCw,
  RotateCcw,
  Undo2,
  Redo2,
  Download,
  Save,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  Check,
  FileText,
  Rows,
  Grid,
  CircleDot,
  Tablet,
  Palette,
  Image as ImageIcon,
  FileUp,
  Move,
  BoxSelect,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  ToolType,
  PaperOrientation,
  PaperTemplate,
  Point,
  Stroke,
  PageState,
  ImageElement,
  DocumentAnnotationState,
} from "@/lib/pdf-canvas/types";
import {
  calculateStrokeBBox,
  isStrokeHitByEraser,
  renderStroke,
  drawPaperPattern,
  optimizeImageFile,
  isPointInImage,
  getImageResizeHandle,
  isStrokeInRect,
  isImageInRect,
} from "@/lib/pdf-canvas/algorithms";
import { exportAnnotatedPdfBlob } from "@/lib/pdf-canvas/export";
import {
  exportCurrentPageAsImage,
  exportAllPagesAsImages,
} from "@/lib/pdf-canvas/export-images";
import { PDFDocument } from "pdf-lib";
import { SaveDigitalNotebookModal } from "./SaveDigitalNotebookModal";
import { NoteCategoryItem } from "./NoteFormModal";

// A4 Dimensions in PDF Points (72 dpi)
const A4_PORTRAIT_WIDTH = 595.28;
const A4_PORTRAIT_HEIGHT = 841.89;

const PRESET_PEN_COLORS = [
  "#0f172a", // Slate / ดำเข้ม
  "#2563eb", // น้ำเงิน
  "#dc2626", // แดง
  "#16a34a", // เขียว
  "#d97706", // ส้ม
  "#7c3aed", // ม่วง
  "#475569", // เทา
];

const PRESET_HIGHLIGHT_COLORS = [
  "#fef08a", // เหลืองอ่อน
  "#bbf7d0", // เขียวอ่อน
  "#bae6fd", // ฟ้าอ่อน
  "#fbcfe8", // ชมพูอ่อน
  "#fed7aa", // ส้มอ่อน
];

interface PdfNoteStudioProps {
  isOpen: boolean;
  onClose: () => void;
  noteId?: string;
  noteTitle?: string;
  pdfUrl?: string | null;
  initialAnnotation?: DocumentAnnotationState | null;
  initialStrokes?: Stroke[];
  initialImages?: ImageElement[];
  categories?: NoteCategoryItem[];
  noteType?: string;
  onSave?: (
    annotation: DocumentAnnotationState,
    pdfBlob?: Blob,
    customTitle?: string,
    customCategoryId?: string | null
  ) => Promise<boolean | void> | boolean | void;
}

export default function PdfNoteStudio({
  isOpen,
  onClose,
  noteId,
  noteTitle = "บันทึก PDF",
  pdfUrl,
  initialAnnotation = null,
  initialStrokes = [],
  initialImages = [],
  categories = [],
  noteType = "normal",
  onSave,
}: PdfNoteStudioProps) {
  // --- Tool & Drawing States ---
  const [tool, setTool] = useState<ToolType>("pen");
  const [penColor, setPenColor] = useState<string>("#0f172a");
  const [highlighterColor, setHighlighterColor] = useState<string>("#fef08a");
  const [strokeWidth, setStrokeWidth] = useState<number>(2.5);
  const [eraserRadius, setEraserRadius] = useState<number>(14);
  const [isStylusOnly, setIsStylusOnly] = useState<boolean>(false);

  // --- Multi-page Document States ---
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [pages, setPages] = useState<PageState[]>([
    {
      pageIndex: 0,
      rotation: 0,
      orientation: "portrait",
      width: A4_PORTRAIT_WIDTH,
      height: A4_PORTRAIT_HEIGHT,
      template: "blank",
      isCustomPage: true,
    },
  ]);

  // Strokes & Images State
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [images, setImages] = useState<ImageElement[]>(initialImages);

  // --- Selection & Marquee / Lasso State ---
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [selectionRect, setSelectionRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [isMovingSelection, setIsMovingSelection] = useState<boolean>(false);
  const moveStartPtRef = useRef<Point | null>(null);

  // Single Image Resize Reference
  const singleImageResizeHandleRef = useRef<'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const singleImageInitStateRef = useRef<{ x: number; y: number; width: number; height: number; aspectRatio: number } | null>(null);

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<{ strokes: Stroke[]; images: ImageElement[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ strokes: Stroke[]; images: ImageElement[] }[]>([]);

  // Responsive Zoom & Layout States
  const [zoom, setZoom] = useState<number>(1.0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgressText, setExportProgressText] = useState<string>("");
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Modal สำหรับบันทึกสมุดจดเล่มใหม่ (เลือกหมวดหมู่และชื่อ)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [currentDisplayTitle, setCurrentDisplayTitle] = useState<string>(noteTitle);

  // การตรวจจับการแก้ไข (Unsaved Changes) และ Modal ยืนยันก่อนปิดหน้าต่าง
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState<boolean>(false);
  const shouldCloseAfterSaveRef = useRef<boolean>(false);

  useEffect(() => {
    setCurrentDisplayTitle(noteTitle);
  }, [noteTitle]);

  useEffect(() => {
    if (isOpen) {
      setIsDirty(false);
      setIsUnsavedModalOpen(false);
      shouldCloseAfterSaveRef.current = false;
    }
  }, [isOpen]);

  // Raw original PDF buffer
  const [originalPdfBuffer, setOriginalPdfBuffer] = useState<ArrayBuffer | null>(null);

  // Refs สำหรับเก็บ annotation/blob ชั่วคราวก่อนแสดง SaveDigitalNotebookModal (สมุดจดใหม่)
  const pendingAnnotationRef = useRef<DocumentAnnotationState | null>(null);
  const pendingBlobRef = useRef<Blob | null>(null);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const isErasingRef = useRef<boolean>(false);

  // Touch Pinch-to-zoom References
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1.0);

  // Hidden File Input References
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const imgFileInputRef = useRef<HTMLInputElement>(null);

  // PDF.js Document Proxy
  const pdfDocProxyRef = useRef<any>(null);

  // Detect Mobile Screen Width on Mount & Resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Click outside to close export dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExportMenuOpen]);

  // Load initialAnnotation (strokes, images, pages) if passed from note
  useEffect(() => {
    if (!isOpen) return;

    if (initialAnnotation) {
      if (Array.isArray(initialAnnotation.strokes)) {
        setStrokes(initialAnnotation.strokes);
      }
      if (Array.isArray(initialAnnotation.images)) {
        setImages(initialAnnotation.images);
      }
      if (Array.isArray(initialAnnotation.pages) && initialAnnotation.pages.length > 0) {
        setPages(initialAnnotation.pages);
      }
    } else if (noteId && typeof window !== "undefined") {
      // Fallback: localStorage for offline resilience
      const strokeKey = `pdf_studio_strokes_${noteId}`;
      const imageKey = `pdf_studio_images_${noteId}`;
      try {
        const savedStrokes = localStorage.getItem(strokeKey);
        if (savedStrokes) {
          const parsed = JSON.parse(savedStrokes);
          if (Array.isArray(parsed) && parsed.length > 0) setStrokes(parsed);
        }
        const savedImages = localStorage.getItem(imageKey);
        if (savedImages) {
          const parsedImgs = JSON.parse(savedImages);
          if (Array.isArray(parsedImgs) && parsedImgs.length > 0) setImages(parsedImgs);
        }
      } catch (err) {
        console.error("Error reading saved data:", err);
      }
    }
  }, [isOpen, noteId, initialAnnotation]);

  // Load PDF when pdfUrl is provided (bypassing any browser cache)
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function loadPdf() {
      if (!pdfUrl) {
        if (!initialAnnotation?.pages || initialAnnotation.pages.length === 0) {
          setPages([
            {
              pageIndex: 0,
              rotation: 0,
              orientation: "portrait",
              width: A4_PORTRAIT_WIDTH,
              height: A4_PORTRAIT_HEIGHT,
              template: "ruled",
              isCustomPage: true,
            },
          ]);
        }
        return;
      }

      setIsLoadingPdf(true);
      try {
        const res = await fetch(pdfUrl, { cache: "no-store" });
        const rawBuffer = await res.arrayBuffer();
        if (!isMounted) return;

        // Clone buffer to prevent Web Worker detachment
        const cleanBuffer = rawBuffer.slice(0);
        setOriginalPdfBuffer(cleanBuffer);

        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(cleanBuffer.slice(0)) });
        const doc = await loadingTask.promise;
        if (!isMounted) return;

        pdfDocProxyRef.current = doc;

        // If no prior pages were saved in annotation, initialize from PDF pages
        if (!initialAnnotation?.pages || initialAnnotation.pages.length === 0) {
          const totalPages = doc.numPages;
          const newPages: PageState[] = [];

          for (let i = 1; i <= totalPages; i++) {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 1.0 });
            const isLandscape = viewport.width > viewport.height;
            newPages.push({
              pageIndex: i - 1,
              rotation: 0,
              orientation: isLandscape ? "landscape" : "portrait",
              width: viewport.width,
              height: viewport.height,
              template: "blank",
              isCustomPage: false,
            });
          }

          setPages(newPages);
          setCurrentPageIndex(0);
        }
      } catch (err) {
        console.error("Failed to load PDF in Studio:", err);
        Swal.fire({
          icon: "warning",
          title: "ไม่สามารถโหลดเนื้อหา PDF ได้",
          text: "ระบบจะเปิดหน้ากระดาษเปล่าสำหรับเขียนโน้ตให้แทน",
          confirmButtonText: "ตกลง",
        });
      } finally {
        if (isMounted) setIsLoadingPdf(false);
      }
    }

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [isOpen, pdfUrl, initialAnnotation]);

  // Current page dimensions considering rotation
  const currentPage = pages[currentPageIndex] || {
    pageIndex: 0,
    rotation: 0,
    orientation: "portrait",
    width: A4_PORTRAIT_WIDTH,
    height: A4_PORTRAIT_HEIGHT,
    template: "blank",
  };

  const isRotated90or270 = currentPage.rotation === 90 || currentPage.rotation === 270;
  const displayWidth = isRotated90or270 ? currentPage.height : currentPage.width;
  const displayHeight = isRotated90or270 ? currentPage.width : currentPage.height;

  // Auto Fit Width for mobile / responsive devices
  const handleFitWidth = useCallback(() => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth - (isMobile ? 16 : 40);
    if (displayWidth > 0) {
      const fitZoom = Math.min(2.5, Math.max(0.35, Number((containerW / displayWidth).toFixed(2))));
      setZoom(fitZoom);
    }
  }, [displayWidth, isMobile]);

  useEffect(() => {
    if (isOpen && isMobile) {
      handleFitWidth();
    }
  }, [isOpen, isMobile, displayWidth, handleFitWidth]);

  // Render PDF Background onto pdfCanvasRef
  const renderPdfBackground = useCallback(async () => {
    const canvas = pdfCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const finalScale = zoom * dpr;

    canvas.width = displayWidth * finalScale;
    canvas.height = displayHeight * finalScale;
    canvas.style.width = `${displayWidth * zoom}px`;
    canvas.style.height = `${displayHeight * zoom}px`;

    ctx.save();
    ctx.scale(finalScale, finalScale);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    if (pdfDocProxyRef.current && !currentPage.isCustomPage) {
      try {
        const pageNum = currentPageIndex + 1;
        const page = await pdfDocProxyRef.current.getPage(pageNum);
        const viewport = page.getViewport({
          scale: 1.0,
          rotation: (page.rotate + currentPage.rotation) % 360,
        });

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
      } catch (e) {
        console.warn("PDF page render warning:", e);
      }
    } else {
      drawPaperPattern(ctx, displayWidth, displayHeight, currentPage.template, 1);
    }

    ctx.restore();
  }, [currentPage, currentPageIndex, displayWidth, displayHeight, zoom]);

  // Render User Strokes onto drawCanvasRef
  const redrawStrokes = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const finalScale = zoom * dpr;

    canvas.width = displayWidth * finalScale;
    canvas.height = displayHeight * finalScale;
    canvas.style.width = `${displayWidth * zoom}px`;
    canvas.style.height = `${displayHeight * zoom}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(finalScale, finalScale);

    const pageStrokes = strokes.filter((s) => s.pageIndex === currentPageIndex);

    for (const stroke of pageStrokes) {
      const isSelected = selectedStrokeIds.includes(stroke.id);
      if (isSelected) {
        ctx.save();
        ctx.shadowColor = "#3b82f6";
        ctx.shadowBlur = 6;
        renderStroke(ctx, stroke, 1);
        ctx.restore();
      } else {
        renderStroke(ctx, stroke, 1);
      }
    }

    if (currentStrokeRef.current) {
      renderStroke(ctx, currentStrokeRef.current, 1);
    }

    // Render Live Marquee Selection Rectangle if active
    if (isSelecting && selectionRect) {
      const x = Math.min(selectionRect.x1, selectionRect.x2);
      const y = Math.min(selectionRect.y1, selectionRect.y2);
      const w = Math.abs(selectionRect.x2 - selectionRect.x1);
      const h = Math.abs(selectionRect.y2 - selectionRect.y1);

      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 1.5;
      ctx.fillStyle = "rgba(37, 99, 235, 0.12)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }

    ctx.restore();
  }, [currentPageIndex, displayWidth, displayHeight, strokes, zoom, selectedStrokeIds, isSelecting, selectionRect]);

  useEffect(() => {
    if (isOpen) {
      renderPdfBackground();
      redrawStrokes();
    }
  }, [isOpen, renderPdfBackground, redrawStrokes]);

  // Compute Selection Bounding Box
  const selectionBounds = useMemo(() => {
    if (selectedStrokeIds.length === 0 && selectedImageIds.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const s of strokes) {
      if (selectedStrokeIds.includes(s.id) && s.pageIndex === currentPageIndex) {
        for (const p of s.points) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
      }
    }

    for (const img of images) {
      if (selectedImageIds.includes(img.id) && img.pageIndex === currentPageIndex) {
        if (img.x < minX) minX = img.x;
        if (img.y < minY) minY = img.y;
        if (img.x + img.width > maxX) maxX = img.x + img.width;
        if (img.y + img.height > maxY) maxY = img.y + img.height;
      }
    }

    if (minX === Infinity) return null;
    return { minX: minX - 8, minY: minY - 8, maxX: maxX + 8, maxY: maxY + 8 };
  }, [selectedStrokeIds, selectedImageIds, strokes, images, currentPageIndex]);

  // Undo / Redo helpers
  const pushHistorySnapshot = () => {
    setUndoStack((prev) => [...prev.slice(-30), { strokes, images }]);
    setRedoStack([]);
    setIsDirty(true);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prevSnapshot = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, { strokes, images }]);
    setUndoStack((prev) => prev.slice(0, -1));
    setStrokes(prevSnapshot.strokes);
    setImages(prevSnapshot.images);
    setSelectedStrokeIds([]);
    setSelectedImageIds([]);
    setIsDirty(true);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextSnapshot = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, { strokes, images }]);
    setRedoStack((prev) => prev.slice(0, -1));
    setStrokes(nextSnapshot.strokes);
    setImages(nextSnapshot.images);
    setSelectedStrokeIds([]);
    setSelectedImageIds([]);
    setIsDirty(true);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === "p") {
        setTool("pen");
      } else if (e.key.toLowerCase() === "h") {
        setTool("highlighter");
      } else if (e.key.toLowerCase() === "e") {
        setTool("eraser");
      } else if (e.key.toLowerCase() === "s") {
        setTool("select");
      } else if (e.key === "Delete" || e.key === "Backspace") {
        handleDeleteSelected();
      } else if (e.key === "Escape") {
        if (isUnsavedModalOpen) {
          setIsUnsavedModalOpen(false);
          shouldCloseAfterSaveRef.current = false;
        } else if (isSaveModalOpen) {
          setIsSaveModalOpen(false);
          shouldCloseAfterSaveRef.current = false;
        } else {
          handleRequestClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, strokes, images, selectedStrokeIds, selectedImageIds, undoStack, redoStack, isUnsavedModalOpen, isSaveModalOpen, isDirty]);

  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    return {
      x: clientX / zoom,
      y: clientY / zoom,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  // Delete all items in the selection
  const handleDeleteSelected = () => {
    if (selectedStrokeIds.length === 0 && selectedImageIds.length === 0) return;
    pushHistorySnapshot();

    const strokeIdSet = new Set(selectedStrokeIds);
    const imageIdSet = new Set(selectedImageIds);

    setStrokes((prev) => prev.filter((s) => !strokeIdSet.has(s.id)));
    setImages((prev) => prev.filter((img) => !imageIdSet.has(img.id)));

    setSelectedStrokeIds([]);
    setSelectedImageIds([]);
  };

  // Clear selection
  const handleDeselect = () => {
    setSelectedStrokeIds([]);
    setSelectedImageIds([]);
  };

  // Pointer Down Handler
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "pan") return;
    if (isStylusOnly && e.pointerType !== "pen") return;

    const pt = getCanvasCoordinates(e);

    // --- TOOL: SELECT (Lasso / Marquee) ---
    if (tool === "select") {
      // 1. Check if clicking inside active selection bounds to start moving
      if (
        selectionBounds &&
        pt.x >= selectionBounds.minX &&
        pt.x <= selectionBounds.maxX &&
        pt.y >= selectionBounds.minY &&
        pt.y <= selectionBounds.maxY
      ) {
        setIsMovingSelection(true);
        moveStartPtRef.current = pt;
        pushHistorySnapshot();
        e.currentTarget.setPointerCapture(e.pointerId);
        isPointerDownRef.current = true;
        return;
      }

      // 2. Check if clicking directly on a single image to select it
      const pageImages = images.filter((img) => img.pageIndex === currentPageIndex);
      const clickedImg = [...pageImages].reverse().find((img) => isPointInImage(pt, img));

      if (clickedImg) {
        setSelectedImageIds([clickedImg.id]);
        setSelectedStrokeIds([]);

        const handle = getImageResizeHandle(pt, clickedImg, 14 / zoom);
        if (handle) {
          singleImageResizeHandleRef.current = handle;
          singleImageInitStateRef.current = {
            x: clickedImg.x,
            y: clickedImg.y,
            width: clickedImg.width,
            height: clickedImg.height,
            aspectRatio: clickedImg.aspectRatio,
          };
        } else {
          setIsMovingSelection(true);
          moveStartPtRef.current = pt;
        }

        e.currentTarget.setPointerCapture(e.pointerId);
        isPointerDownRef.current = true;
        return;
      }

      // 3. Otherwise: start drawing selection marquee rectangle
      handleDeselect();
      setIsSelecting(true);
      setSelectionRect({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
      e.currentTarget.setPointerCapture(e.pointerId);
      isPointerDownRef.current = true;
      return;
    }

    // --- TOOL: PEN, HIGHLIGHTER, ERASER ---
    e.currentTarget.setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;

    if (tool === "eraser") {
      isErasingRef.current = true;
      eraseAtPoint(pt);
    } else {
      pushHistorySnapshot();

      const activeColor = tool === "pen" ? penColor : highlighterColor;
      const activeWidth = tool === "pen" ? strokeWidth : strokeWidth * 4;
      const activeOpacity = tool === "pen" ? 1.0 : 0.35;

      const newStroke: Stroke = {
        id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        pageIndex: currentPageIndex,
        tool: tool === "highlighter" ? "highlighter" : "pen",
        color: activeColor,
        width: activeWidth,
        opacity: activeOpacity,
        points: [pt],
      };

      currentStrokeRef.current = newStroke;
      redrawStrokes();
    }
  };

  // Pointer Move Handler
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;
    if (tool === "pan") return;
    if (isStylusOnly && e.pointerType !== "pen") return;

    const pt = getCanvasCoordinates(e);

    // SELECT TOOL MOVING / DRAGGING SELECTION
    if (tool === "select") {
      if (isMovingSelection && moveStartPtRef.current) {
        const dx = pt.x - moveStartPtRef.current.x;
        const dy = pt.y - moveStartPtRef.current.y;
        moveStartPtRef.current = pt;

        // Move selected strokes
        if (selectedStrokeIds.length > 0) {
          const idSet = new Set(selectedStrokeIds);
          setStrokes((prev) =>
            prev.map((s) => {
              if (!idSet.has(s.id)) return s;
              const newPts = s.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
              return {
                ...s,
                points: newPts,
                bbox: calculateStrokeBBox(newPts, s.width),
              };
            })
          );
        }

        // Move selected images
        if (selectedImageIds.length > 0) {
          const idSet = new Set(selectedImageIds);
          setImages((prev) =>
            prev.map((img) =>
              idSet.has(img.id)
                ? {
                    ...img,
                    x: img.x + dx,
                    y: img.y + dy,
                  }
                : img
            )
          );
        }

        redrawStrokes();
        return;
      }

      // SELECT TOOL RESIZING SINGLE IMAGE
      if (singleImageResizeHandleRef.current && singleImageInitStateRef.current && selectedImageIds.length === 1) {
        const init = singleImageInitStateRef.current;
        let newW = init.width;
        let newH = init.height;

        if (singleImageResizeHandleRef.current === "se") {
          newW = Math.max(40, pt.x - init.x);
          newH = newW / init.aspectRatio;
        } else if (singleImageResizeHandleRef.current === "sw") {
          newW = Math.max(40, init.x + init.width - pt.x);
          newH = newW / init.aspectRatio;
        }

        setImages((prev) =>
          prev.map((img) =>
            img.id === selectedImageIds[0]
              ? {
                  ...img,
                  width: newW,
                  height: newH,
                }
              : img
          )
        );
        return;
      }

      // SELECT TOOL DRAWING MARQUEE
      if (isSelecting && selectionRect) {
        setSelectionRect((prev) => (prev ? { ...prev, x2: pt.x, y2: pt.y } : null));
        redrawStrokes();
        return;
      }

      return;
    }

    if (tool === "eraser") {
      eraseAtPoint(pt);
    } else if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push(pt);
      redrawStrokes();
    }
  };

  // Pointer Up Handler
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    isErasingRef.current = false;
    setIsMovingSelection(false);
    moveStartPtRef.current = null;
    singleImageResizeHandleRef.current = null;
    singleImageInitStateRef.current = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    // Complete Marquee Selection
    if (tool === "select" && isSelecting && selectionRect) {
      setIsSelecting(false);
      const minX = Math.min(selectionRect.x1, selectionRect.x2);
      const maxX = Math.max(selectionRect.x1, selectionRect.x2);
      const minY = Math.min(selectionRect.y1, selectionRect.y2);
      const maxY = Math.max(selectionRect.y1, selectionRect.y2);

      // Require a minimum drag distance to prevent accidental tiny selections
      if (maxX - minX > 5 || maxY - minY > 5) {
        const rect = { minX, maxX, minY, maxY };

        const hitStrokes = strokes.filter(
          (s) => s.pageIndex === currentPageIndex && isStrokeInRect(s, rect)
        );
        const hitImages = images.filter(
          (img) => img.pageIndex === currentPageIndex && isImageInRect(img, rect)
        );

        setSelectedStrokeIds(hitStrokes.map((s) => s.id));
        setSelectedImageIds(hitImages.map((img) => img.id));
      }

      setSelectionRect(null);
      redrawStrokes();
      return;
    }

    if (currentStrokeRef.current) {
      const finishedStroke = {
        ...currentStrokeRef.current,
        bbox: calculateStrokeBBox(
          currentStrokeRef.current.points,
          currentStrokeRef.current.width
        ),
      };
      setStrokes((prev) => [...prev, finishedStroke]);
      currentStrokeRef.current = null;
      setIsDirty(true);
      redrawStrokes();
    }
  };

  // Stroke Eraser Algorithm
  const eraseAtPoint = (pt: Point) => {
    const hits = strokes.filter(
      (s) =>
        s.pageIndex === currentPageIndex &&
        isStrokeHitByEraser(s, pt, eraserRadius)
    );

    if (hits.length > 0) {
      pushHistorySnapshot();
      const hitIds = new Set(hits.map((h) => h.id));
      setStrokes((prev) => prev.filter((s) => !hitIds.has(s.id)));
    }
  };

  // Clear all strokes on current page
  const handleClearCurrentPage = () => {
    const pageStrokesCount = strokes.filter((s) => s.pageIndex === currentPageIndex).length;
    const pageImagesCount = images.filter((img) => img.pageIndex === currentPageIndex).length;
    if (pageStrokesCount === 0 && pageImagesCount === 0) return;

    Swal.fire({
      title: "ล้างทุกอย่างในหน้านี้?",
      text: "คุณต้องการลบข้อความ ภาพวาด และรูปภาพทั้งหมดในหน้านี้ใช่หรือไม่",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ล้างทั้งหมด",
      cancelButtonText: "ยกเลิก",
    }).then((res) => {
      if (res.isConfirmed) {
        pushHistorySnapshot();
        setStrokes((prev) => prev.filter((s) => s.pageIndex !== currentPageIndex));
        setImages((prev) => prev.filter((img) => img.pageIndex !== currentPageIndex));
        setSelectedStrokeIds([]);
        setSelectedImageIds([]);
      }
    });
  };

  // Touch Pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = currentDist / touchStartDistRef.current;
      const nextZoom = Math.min(2.8, Math.max(0.35, Number((touchStartZoomRef.current * ratio).toFixed(2))));
      setZoom(nextZoom);
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
  };

  // Import PDF Click
  const handleImportPdfClick = () => {
    pdfFileInputRef.current?.click();
  };

  const handleImportImageClick = () => {
    imgFileInputRef.current?.click();
  };

  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoadingPdf(true);
      const rawBuffer = await file.arrayBuffer();
      const cleanBuffer = rawBuffer.slice(0);

      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(cleanBuffer.slice(0)) });
      const doc = await loadingTask.promise;

      const choice = await Swal.fire({
        title: "นำเข้าเอกสาร PDF",
        text: `ไฟล์ "${file.name}" มีทั้งหมด ${doc.numPages} หน้า คุณต้องการเปิดเป็นเอกสารใหม่ หรือแทรกต่อท้ายหน้าเดิม?`,
        icon: "question",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "แทรกต่อท้าย",
        denyButtonText: "เปิดเป็นเอกสารใหม่",
        cancelButtonText: "ยกเลิก",
      });

      if (choice.isConfirmed) {
        let mergedBytes: Uint8Array;
        try {
          const mergedDoc = await PDFDocument.create();

          // 1. Copy existing pages from originalPdfBuffer, or if previous pages were custom, create blank pages
          if (originalPdfBuffer && originalPdfBuffer.byteLength > 0) {
            const prevDoc = await PDFDocument.load(new Uint8Array(originalPdfBuffer.slice(0)), { ignoreEncryption: true });
            const prevPages = await mergedDoc.copyPages(prevDoc, prevDoc.getPageIndices());
            prevPages.forEach((cp) => mergedDoc.addPage(cp));
          } else {
            for (let i = 0; i < pages.length; i++) {
              mergedDoc.addPage([pages[i].width, pages[i].height]);
            }
          }

          // 2. Append newly imported PDF pages
          const appendPdfDoc = await PDFDocument.load(new Uint8Array(cleanBuffer.slice(0)), { ignoreEncryption: true });
          const copiedPages = await mergedDoc.copyPages(appendPdfDoc, appendPdfDoc.getPageIndices());
          copiedPages.forEach((cp) => mergedDoc.addPage(cp));

          mergedBytes = await mergedDoc.save();
        } catch (mergeErr) {
          console.error("PDF merge error, appending without background:", mergeErr);
          mergedBytes = new Uint8Array(cleanBuffer.slice(0));
        }

        // Reload pdfjs proxy with the full merged PDF
        const mergedBuffer = mergedBytes.buffer.slice(0) as ArrayBuffer;
        setOriginalPdfBuffer(mergedBuffer);
        const freshDoc = await pdfjs.getDocument({ data: new Uint8Array(mergedBytes.slice(0)) }).promise;
        pdfDocProxyRef.current = freshDoc;

        const startIndex = pages.length;
        const newPages: PageState[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1.0 });
          newPages.push({
            pageIndex: startIndex + i - 1,
            rotation: 0,
            orientation: viewport.width > viewport.height ? "landscape" : "portrait",
            width: viewport.width,
            height: viewport.height,
            template: "blank",
            isCustomPage: false,
          });
        }
        setPages((prev) => [...prev, ...newPages]);
        setCurrentPageIndex(startIndex);
      } else if (choice.isDenied) {
        setOriginalPdfBuffer(cleanBuffer.slice(0));
        pdfDocProxyRef.current = doc;
        const newPages: PageState[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1.0 });
          newPages.push({
            pageIndex: i - 1,
            rotation: 0,
            orientation: viewport.width > viewport.height ? "landscape" : "portrait",
            width: viewport.width,
            height: viewport.height,
            template: "blank",
            isCustomPage: false,
          });
        }
        setPages(newPages);
        setCurrentPageIndex(0);
        setStrokes([]);
        setImages([]);
        setSelectedStrokeIds([]);
        setSelectedImageIds([]);
      }
    } catch (err: any) {
      console.error("PDF import error:", err);
      Swal.fire({ icon: "error", title: "ไม่สามารถนำเข้า PDF ได้", text: err.message });
    } finally {
      setIsLoadingPdf(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const opt = await optimizeImageFile(file, 1800);

      const choice = await Swal.fire({
        title: "แทรกรูปภาพ",
        text: "คุณต้องการแทรกรูปภาพลงบนหน้านี้ หรือเพิ่มเป็นหน้ากระดาษใหม่เต็มหน้า?",
        icon: "question",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "แทรกบนหน้านี้",
        denyButtonText: "เพิ่มเป็นหน้าใหม่",
        cancelButtonText: "ยกเลิก",
      });

      if (choice.isConfirmed) {
        pushHistorySnapshot();
        const imgW = Math.min(displayWidth * 0.75, opt.width * 0.45);
        const imgH = imgW / opt.aspectRatio;

        const newImg: ImageElement = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          pageIndex: currentPageIndex,
          dataUrl: opt.dataUrl,
          x: Math.max(20, (displayWidth - imgW) / 2),
          y: Math.max(20, (displayHeight - imgH) / 2),
          width: imgW,
          height: imgH,
          aspectRatio: opt.aspectRatio,
        };

        setImages((prev) => [...prev, newImg]);
        setSelectedImageIds([newImg.id]);
        setSelectedStrokeIds([]);
        setTool("select");
      } else if (choice.isDenied) {
        pushHistorySnapshot();
        const isLandscape = opt.aspectRatio > 1;
        const newPage: PageState = {
          pageIndex: pages.length,
          rotation: 0,
          orientation: isLandscape ? "landscape" : "portrait",
          width: isLandscape ? A4_PORTRAIT_HEIGHT : A4_PORTRAIT_WIDTH,
          height: isLandscape ? A4_PORTRAIT_WIDTH : A4_PORTRAIT_HEIGHT,
          template: "blank",
          isCustomPage: true,
        };

        const targetW = newPage.width - 40;
        const targetH = targetW / opt.aspectRatio;

        const newImg: ImageElement = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          pageIndex: pages.length,
          dataUrl: opt.dataUrl,
          x: 20,
          y: Math.max(20, (newPage.height - targetH) / 2),
          width: targetW,
          height: targetH,
          aspectRatio: opt.aspectRatio,
        };

        setPages((prev) => [...prev, newPage]);
        setImages((prev) => [...prev, newImg]);
        setCurrentPageIndex(pages.length);
      }
    } catch (err: any) {
      console.error("Image import error:", err);
      Swal.fire({ icon: "error", title: "ไม่สามารถนำเข้ารูปภาพได้", text: err.message });
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  // Orientation & Page Operations
  const handleToggleOrientation = () => {
    setIsDirty(true);
    setPages((prev) =>
      prev.map((p, idx) => {
        if (idx !== currentPageIndex) return p;
        const newOrientation: PaperOrientation =
          p.orientation === "portrait" ? "landscape" : "portrait";
        return {
          ...p,
          orientation: newOrientation,
          width: p.height,
          height: p.width,
        };
      })
    );
  };

  const handleRotatePage = () => {
    setIsDirty(true);
    setPages((prev) =>
      prev.map((p, idx) => {
        if (idx !== currentPageIndex) return p;
        const nextRotation = ((p.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        return {
          ...p,
          rotation: nextRotation,
        };
      })
    );
  };

  const handleChangeTemplate = (template: PaperTemplate) => {
    setIsDirty(true);
    setPages((prev) =>
      prev.map((p, idx) => (idx === currentPageIndex ? { ...p, template } : p))
    );
  };

  const handleAddPage = (orientation: PaperOrientation = "portrait") => {
    setIsDirty(true);
    const isLandscape = orientation === "landscape";
    const newPage: PageState = {
      pageIndex: pages.length,
      rotation: 0,
      orientation,
      width: isLandscape ? A4_PORTRAIT_HEIGHT : A4_PORTRAIT_WIDTH,
      height: isLandscape ? A4_PORTRAIT_WIDTH : A4_PORTRAIT_HEIGHT,
      template: "ruled",
      isCustomPage: true,
    };
    setPages((prev) => [...prev, newPage]);
    setCurrentPageIndex(pages.length);
  };

  // ลบหน้ากระดาษปัจจุบัน (Delete Current Page)
  const handleDeleteCurrentPage = async () => {
    if (pages.length <= 1) {
      Swal.fire({
        icon: "info",
        title: "ไม่สามารถลบหน้านี้ได้",
        text: "สมุดจดต้องมีหน้ากระดาษอย่างน้อย 1 หน้า (หากต้องการล้างเนื้อหา สามารถกดปุ่มรีเซ็ตได้)",
        confirmButtonText: "เข้าใจแล้ว",
      });
      return;
    }

    const delIndex = currentPageIndex;
    const result = await Swal.fire({
      title: `ลบหน้า ${delIndex + 1}?`,
      text: `คุณต้องการลบหน้า ${delIndex + 1} จากทั้งหมด ${pages.length} หน้าใช่หรือไม่? ลายเส้นและรูปภาพในหน้านี้จะถูกลบออกด้วย`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ลบหน้านี้",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    pushHistorySnapshot();

    // 1. ถ้ามี PDF Buffer ให้ลบหน้าออกจาก PDF ด้วย
    if (originalPdfBuffer && originalPdfBuffer.byteLength > 0) {
      try {
        const doc = await PDFDocument.load(new Uint8Array(originalPdfBuffer.slice(0)), { ignoreEncryption: true });
        if (delIndex < doc.getPageCount()) {
          doc.removePage(delIndex);
          const newBytes = await doc.save();
          const newBuffer = newBytes.buffer.slice(0) as ArrayBuffer;
          setOriginalPdfBuffer(newBuffer);

          const pdfjs = await import("pdfjs-dist");
          const freshDoc = await pdfjs.getDocument({ data: new Uint8Array(newBytes.slice(0)) }).promise;
          pdfDocProxyRef.current = freshDoc;
        }
      } catch (err) {
        console.warn("Failed to remove page from PDF buffer:", err);
      }
    }

    // 2. ลบลายเส้นและรูปภาพในหน้านี้ และปรับ pageIndex ของหน้าที่อยู่ถัดไปลดลง 1
    setStrokes((prev) =>
      prev
        .filter((s) => s.pageIndex !== delIndex)
        .map((s) => (s.pageIndex > delIndex ? { ...s, pageIndex: s.pageIndex - 1 } : s))
    );
    setImages((prev) =>
      prev
        .filter((img) => img.pageIndex !== delIndex)
        .map((img) => (img.pageIndex > delIndex ? { ...img, pageIndex: img.pageIndex - 1 } : img))
    );

    // 3. กรองหน้านั้นออกจาก pages และจัดเรียง index ใหม่
    const remainingPages = pages
      .filter((_, idx) => idx !== delIndex)
      .map((p, idx) => ({ ...p, pageIndex: idx }));

    setPages(remainingPages);
    setSelectedStrokeIds([]);
    setSelectedImageIds([]);

    // 4. สลับไปหน้าที่เหมาะสม
    const nextPageIndex = Math.min(delIndex, remainingPages.length - 1);
    setCurrentPageIndex(Math.max(0, nextPageIndex));

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `ลบหน้า ${delIndex + 1} เรียบร้อยแล้ว`,
      showConfirmButton: false,
      timer: 1500,
    });
  };

  // รีเซ็ตสมุดจดทั้งหมด (Reset entire notebook)
  const handleResetAll = async () => {
    const result = await Swal.fire({
      title: "รีเซ็ตสมุดจดทั้งหมด?",
      text: "การดำเนินการนี้จะลบหน้ากระดาษเพิ่มเติม ไฟล์ PDF ที่นำเข้า ลายเส้น และรูปภาพทั้งหมด กลับสู่หน้ากระดาษเปล่าเริ่มต้น 1 หน้า!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "รีเซ็ตทั้งหมด",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    pushHistorySnapshot();

    // รีเซ็ตลายเส้น รูปภาพ และการเลือก
    setStrokes([]);
    setImages([]);
    setSelectedStrokeIds([]);
    setSelectedImageIds([]);

    // รีเซ็ตหน้ากระดาษกลับสู่หน้าเริ่มต้น 1 หน้า
    setPages([
      {
        pageIndex: 0,
        rotation: 0,
        orientation: "portrait",
        width: A4_PORTRAIT_WIDTH,
        height: A4_PORTRAIT_HEIGHT,
        template: "ruled",
        isCustomPage: true,
      },
    ]);
    setCurrentPageIndex(0);

    // รีเซ็ต PDF buffer
    setOriginalPdfBuffer(null);
    pdfDocProxyRef.current = null;

    // ล้าง localStorage
    if (noteId && typeof window !== "undefined") {
      localStorage.removeItem(`pdf_studio_strokes_${noteId}`);
      localStorage.removeItem(`pdf_studio_images_${noteId}`);
    }

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "รีเซ็ตสมุดจดเรียบร้อยแล้ว",
      showConfirmButton: false,
      timer: 1500,
    });
  };

  // --- SAVE & EXPORT WITH DUAL-LAYER STORAGE ---
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Pack full vector annotation state (pages, strokes, images)
      const annotation: DocumentAnnotationState = {
        version: 1,
        pages,
        strokes,
        images,
      };

      // 2. Export annotated PDF blob
      const bufferCopy = originalPdfBuffer ? originalPdfBuffer.slice(0) : null;
      const blob = await exportAnnotatedPdfBlob(bufferCopy, pages, strokes, images);

      // 3. ถ้าเป็นสมุดจดใหม่ (ยังไม่มี noteId) → แสดง modal ให้ตั้งชื่อและเลือกหมวดหมู่ก่อน
      if (!noteId && onSave) {
        pendingAnnotationRef.current = annotation;
        pendingBlobRef.current = blob;
        setIsSaving(false);
        setIsSaveModalOpen(true);
        return;
      }

      // 4. สมุดจดที่มีอยู่แล้ว → บันทึกโดยตรง
      if (onSave) {
        const saveRes = await onSave(annotation, blob);
        if (saveRes === false) return;
      }

      // รีเซ็ตสถานะการแก้ไข (Dirty) เมื่อบันทึกสำเร็จ
      setIsDirty(false);

      // 5. Backup to localStorage for safety
      if (noteId && typeof window !== "undefined") {
        try {
          localStorage.setItem(`pdf_studio_strokes_${noteId}`, JSON.stringify(strokes));
          localStorage.setItem(`pdf_studio_images_${noteId}`, JSON.stringify(images));
        } catch {}
      }

      Swal.fire({
        icon: "success",
        title: "บันทึกเรียบร้อย",
        text: "บันทึกลายเส้นและเอกสารสำเร็จแล้ว",
        timer: 1500,
        showConfirmButton: false,
      });

      // หากเป็นการสั่ง "บันทึกและปิด" ให้ปิด Studio หลังบันทึกสำเร็จ
      if (shouldCloseAfterSaveRef.current) {
        shouldCloseAfterSaveRef.current = false;
        onClose();
      }
    } catch (err: any) {
      console.error("Save error:", err);
      shouldCloseAfterSaveRef.current = false;
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาดในการบันทึก",
        text: err.message || "ไม่สามารถบันทึกข้อมูลได้",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // เรียกเมื่อผู้ใช้กด "บันทึก" ใน SaveDigitalNotebookModal (สมุดจดใหม่เท่านั้น)
  const handleSaveModalConfirm = async (title: string, categoryId: string | null) => {
    if (!pendingAnnotationRef.current || !pendingBlobRef.current) return;
    setIsSaving(true);
    try {
      const saveRes = await onSave?.(
        pendingAnnotationRef.current,
        pendingBlobRef.current,
        title,
        categoryId
      );
      if (saveRes === false) return;
      setIsSaveModalOpen(false);
      pendingAnnotationRef.current = null;
      pendingBlobRef.current = null;
      setIsDirty(false);
      Swal.fire({
        icon: "success",
        title: "บันทึกเรียบร้อย",
        text: "สร้างสมุดจดดิจิทัลสำเร็จแล้ว",
        timer: 1500,
        showConfirmButton: false,
      });

      // หากเป็นการสั่ง "บันทึกและปิด" ให้ปิด Studio หลังบันทึกสำเร็จ
      if (shouldCloseAfterSaveRef.current) {
        shouldCloseAfterSaveRef.current = false;
        onClose();
      }
    } catch (err: any) {
      console.error("Save modal confirm error:", err);
      shouldCloseAfterSaveRef.current = false;
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาดในการบันทึก",
        text: err.message || "ไม่สามารถบันทึกข้อมูลได้",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Handlers สำหรับปิดหน้าต่างและตรวจสอบการบันทึก ---
  const handleRequestClose = () => {
    if (isDirty) {
      setIsUnsavedModalOpen(true);
    } else {
      onClose();
    }
  };

  const handleConfirmSaveAndClose = async () => {
    setIsUnsavedModalOpen(false);
    shouldCloseAfterSaveRef.current = true;
    await handleSave();
  };

  const handleDiscardAndClose = () => {
    setIsUnsavedModalOpen(false);
    setIsDirty(false);
    shouldCloseAfterSaveRef.current = false;
    onClose();
  };

  const handleCancelClose = () => {
    setIsUnsavedModalOpen(false);
    shouldCloseAfterSaveRef.current = false;
  };

  const getSafeBaseFileName = () => {
    return noteTitle.replace(/[^a-zA-Z0-9ก-๙_-]/g, "_") || "note";
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    setExportProgressText("กำลังสร้างเอกสาร PDF...");
    setIsExportMenuOpen(false);
    try {
      const blob = await exportAnnotatedPdfBlob(originalPdfBuffer, pages, strokes, images);

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${getSafeBaseFileName()}_annotated.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      Swal.fire({
        icon: "success",
        title: "ส่งออกไฟล์ PDF สำเร็จ",
        text: "ดาวน์โหลดเอกสาร PDF เรียบร้อยแล้ว",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error("Export PDF error:", err);
      Swal.fire({
        icon: "error",
        title: "ส่งออก PDF ไม่สำเร็จ",
        text: err.message || "เกิดข้อผิดพลาดในการแปลงไฟล์ PDF",
      });
    } finally {
      setIsExporting(false);
      setExportProgressText("");
    }
  };

  const handleExportImageCurrent = async (format: "png" | "jpeg") => {
    setIsExporting(true);
    const label = format.toUpperCase();
    setExportProgressText(`กำลังสร้างภาพ ${label} หน้า ${currentPageIndex + 1}...`);
    setIsExportMenuOpen(false);
    try {
      await exportCurrentPageAsImage(
        currentPageIndex,
        pages,
        strokes,
        images,
        pdfDocProxyRef.current,
        format,
        getSafeBaseFileName()
      );
      Swal.fire({
        icon: "success",
        title: `ส่งออก ${label} สำเร็จ`,
        text: `ดาวน์โหลดภาพหน้า ${currentPageIndex + 1} เรียบร้อยแล้ว`,
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error(`Export ${label} current page error:`, err);
      Swal.fire({
        icon: "error",
        title: `ส่งออก ${label} ไม่สำเร็จ`,
        text: err.message || "เกิดข้อผิดพลาดในการแปลงรูปภาพ",
      });
    } finally {
      setIsExporting(false);
      setExportProgressText("");
    }
  };

  const handleExportImageAll = async (format: "png" | "jpeg") => {
    setIsExporting(true);
    const label = format.toUpperCase();
    setExportProgressText(`กำลังเตรียมส่งออก ${label} ทุกหน้า...`);
    setIsExportMenuOpen(false);
    try {
      await exportAllPagesAsImages(
        pages,
        strokes,
        images,
        pdfDocProxyRef.current,
        format,
        getSafeBaseFileName(),
        isMobile,
        (current, total) => {
          setExportProgressText(`กำลังเรนเดอร์ภาพ ${label} (${current}/${total})...`);
        }
      );
      Swal.fire({
        icon: "success",
        title: `ส่งออก ${label} ทุกหน้าสำเร็จ`,
        text: isMobile
          ? `ดาวน์โหลดภาพครบทั้ง ${pages.length} หน้าแล้ว`
          : `รวมไฟล์ทุกหน้าเป็น ZIP และดาวน์โหลดเรียบร้อยแล้ว`,
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error(`Export all ${label} error:`, err);
      Swal.fire({
        icon: "error",
        title: `ส่งออก ${label} ทุกหน้าไม่สำเร็จ`,
        text: err.message || "เกิดข้อผิดพลาดในการแปลงรูปภาพ",
      });
    } finally {
      setIsExporting(false);
      setExportProgressText("");
    }
  };

  if (!isOpen) return null;

  const currentPageImages = images.filter((img) => img.pageIndex === currentPageIndex);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-slate-100 select-none overflow-hidden"
      style={{ transform: "translateZ(0)" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={pdfFileInputRef}
        accept="application/pdf"
        className="hidden"
        onChange={handlePdfFileChange}
      />
      <input
        type="file"
        ref={imgFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />

      {/* --- TOP HEADER & ACTIONS --- */}
      <header className="h-13 sm:h-14 border-b border-slate-700 bg-slate-900 px-3 sm:px-4 flex items-center justify-between shrink-0 gap-2 z-50 relative">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-1 sm:p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-xs sm:text-sm truncate max-w-[120px] sm:max-w-xs md:max-w-md">
              {noteTitle}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 truncate">
              หน้า {currentPageIndex + 1}/{pages.length} · {currentPage.orientation === "portrait" ? "แนวตั้ง" : "แนวนอน"} ({currentPage.rotation}°)
            </span>
          </div>
        </div>

        {/* Page Switcher */}
        <div className="flex items-center gap-1 bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-700 shrink-0">
          <button
            onClick={() => {
              handleDeselect();
              setCurrentPageIndex((p) => Math.max(0, p - 1));
            }}
            disabled={currentPageIndex === 0}
            className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
            title="หน้าก่อนหน้า"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <span className="text-[11px] sm:text-xs font-medium px-1 sm:px-2">
            {currentPageIndex + 1}/{pages.length}
          </span>
          <button
            onClick={() => {
              handleDeselect();
              setCurrentPageIndex((p) => Math.min(pages.length - 1, p + 1));
            }}
            disabled={currentPageIndex === pages.length - 1}
            className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
            title="หน้าถัดไป"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => handleAddPage(currentPage.orientation)}
            className="p-1 sm:p-1.5 ml-0.5 rounded-lg bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 border border-blue-500/30 text-[11px] sm:text-xs flex items-center gap-1"
            title="เพิ่มหน้ากระดาษใหม่"
          >
            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden md:inline">เพิ่มหน้า</span>
          </button>
          <button
            onClick={handleDeleteCurrentPage}
            disabled={pages.length <= 1}
            className="p-1 sm:p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 disabled:opacity-30 disabled:hover:bg-transparent text-[11px] sm:text-xs flex items-center gap-1"
            title={pages.length <= 1 ? "ต้องมีหน้ากระดาษอย่างน้อย 1 หน้า" : "ลบหน้ากระดาษปัจจุบัน"}
          >
            <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden md:inline">ลบหน้า</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={handleFitWidth}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white"
            title="ปรับพอดีความกว้างหน้าจอ (Fit Width)"
          >
            <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={handleResetAll}
            className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-rose-200 text-xs font-medium flex items-center gap-1 shadow-sm"
            title="รีเซ็ตสมุดจดทั้งหมด (ล้างกระดาษ ลายเส้น และรูปภาพ)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">รีเซ็ต</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 shadow-sm disabled:opacity-50"
            title="บันทึกข้อมูล"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSaving ? "บันทึก..." : "บันทึก"}</span>
          </button>

          {/* Export Dropdown Group */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              disabled={isExporting}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 shadow-sm disabled:opacity-50"
              title="ส่งออกเอกสารและรูปภาพ"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isExporting ? (exportProgressText || "ส่งออก...") : "ส่งออก"}
              </span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${
                  isExportMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 sm:w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-[100] text-xs">
                {/* PDF Option */}
                <button
                  onClick={handleExportPdf}
                  className="w-full px-3 py-2 text-left hover:bg-slate-700 flex items-center gap-2 text-slate-200 hover:text-white"
                >
                  <FileText className="w-4 h-4 text-rose-400" />
                  <div>
                    <div className="font-medium">ส่งออก PDF</div>
                    <div className="text-[10px] text-slate-400">
                      รวมเอกสารทุกหน้าเป็นไฟล์เดียว
                    </div>
                  </div>
                </button>

                <div className="border-t border-slate-700/80 my-1" />

                {/* PNG Options */}
                <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-emerald-400" />
                  <span>ภาพ PNG (ความคมชัดสูง)</span>
                </div>
                <button
                  onClick={() => handleExportImageCurrent("png")}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-700 flex items-center justify-between text-slate-200 hover:text-white pl-6"
                >
                  <span>หน้าปัจจุบัน (หน้า {currentPageIndex + 1})</span>
                  <span className="text-[10px] text-slate-400">.png</span>
                </button>
                <button
                  onClick={() => handleExportImageAll("png")}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-700 flex items-center justify-between text-slate-200 hover:text-white pl-6"
                >
                  <span>ทุกหน้า ({pages.length} หน้า)</span>
                  <span className="text-[10px] text-slate-400">
                    {isMobile ? "ดาวน์โหลดทีละรูป" : ".zip"}
                  </span>
                </button>

                <div className="border-t border-slate-700/80 my-1" />

                {/* JPEG Options */}
                <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-amber-400" />
                  <span>ภาพ JPEG (ขนาดไฟล์กะทัดรัด)</span>
                </div>
                <button
                  onClick={() => handleExportImageCurrent("jpeg")}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-700 flex items-center justify-between text-slate-200 hover:text-white pl-6"
                >
                  <span>หน้าปัจจุบัน (หน้า {currentPageIndex + 1})</span>
                  <span className="text-[10px] text-slate-400">.jpg</span>
                </button>
                <button
                  onClick={() => handleExportImageAll("jpeg")}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-700 flex items-center justify-between text-slate-200 hover:text-white pl-6"
                >
                  <span>ทุกหน้า ({pages.length} หน้า)</span>
                  <span className="text-[10px] text-slate-400">
                    {isMobile ? "ดาวน์โหลดทีละรูป" : ".zip"}
                  </span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleRequestClose}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            title="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* --- DESKTOP TOOLBAR (Hidden on Mobile) --- */}
      <div className="hidden md:flex bg-slate-900 border-b border-slate-700 px-4 py-2 flex-wrap items-center justify-between gap-3 text-xs z-20">
        {/* Main Tools: Pen, Highlighter, Eraser, Select / Lasso, Pan */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setTool("pen")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${
              tool === "pen" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>ปากกา</span>
          </button>
          <button
            onClick={() => setTool("highlighter")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${
              tool === "highlighter" ? "bg-amber-500 text-slate-950 font-semibold" : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Highlighter className="w-4 h-4" />
            <span>ไฮไลต์</span>
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${
              tool === "eraser" ? "bg-rose-600 text-white" : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Eraser className="w-4 h-4" />
            <span>ยางลบ</span>
          </button>
          <button
            onClick={() => setTool("select")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium ${
              tool === "select" ? "bg-indigo-600 text-white font-semibold" : "text-slate-300 hover:bg-slate-700"
            }`}
            title="วาดคลุมเพื่อเลือก ย้ายตำแหน่ง หรือลบ (Lasso / Marquee)"
          >
            <BoxSelect className="w-4 h-4" />
            <span>วาดคลุม / ย้าย</span>
          </button>
          <button
            onClick={() => setTool("pan")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium ${
              tool === "pan" ? "bg-purple-600 text-white" : "text-slate-300 hover:bg-slate-700"
            }`}
            title="เลื่อนหน้าจอ (Hand / Pan)"
          >
            <Hand className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Tool Settings */}
        {tool === "pen" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
              {PRESET_PEN_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full border-2 ${
                    penColor === c ? "border-white scale-110" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                />
              ))}
              <label className="relative cursor-pointer flex items-center justify-center w-5 h-5 rounded-full border border-slate-600 hover:border-white overflow-hidden">
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                  className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
                <Palette className="w-3 h-3 text-slate-400" />
              </label>
            </div>

            <div className="flex items-center gap-2 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-400">ขนาด:</span>
              {[1.5, 2.5, 4, 7].map((w) => (
                <button
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    strokeWidth === w ? "bg-slate-700 text-white border border-slate-500" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <div
                    className="rounded-full bg-white"
                    style={{ width: `${Math.max(2, w * 1.5)}px`, height: `${Math.max(2, w * 1.5)}px` }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {tool === "highlighter" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
              {PRESET_HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setHighlighterColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full border-2 ${
                    highlighterColor === c ? "border-white scale-110" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {tool === "eraser" && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-400">ขนาดยางลบ:</span>
              {[10, 16, 24].map((r) => (
                <button
                  key={r}
                  onClick={() => setEraserRadius(r)}
                  className={`px-2 py-0.5 rounded text-[11px] ${
                    eraserRadius === r ? "bg-slate-700 text-white font-medium" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {r === 10 ? "เล็ก" : r === 16 ? "กลาง" : "ใหญ่"}
                </button>
              ))}
            </div>
            <button
              onClick={handleClearCurrentPage}
              className="px-2.5 py-1 rounded-xl bg-rose-950/60 text-rose-300 hover:bg-rose-900 border border-rose-800/80 flex items-center gap-1"
              title="ล้างเส้นวาดทั้งหมดในหน้านี้"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้างหน้านี้</span>
            </button>
          </div>
        )}

        {/* Import Files Section */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleImportPdfClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
            title="นำเข้าไฟล์ PDF จากอุปกรณ์"
          >
            <FileUp className="w-3.5 h-3.5 text-blue-400" />
            <span>นำเข้า PDF</span>
          </button>
          <button
            onClick={handleImportImageClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
            title="แทรกรูปภาพจากอุปกรณ์หรือกล้อง"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>แทรกรูปภาพ</span>
          </button>
        </div>

        {/* Orientation, Rotation & Paper Options */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleOrientation}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
            title="สลับหน้ากระดาษแนวตั้ง / แนวนอน"
          >
            {currentPage.orientation === "portrait" ? (
              <>
                <Rows className="w-3.5 h-3.5 text-blue-400" />
                <span>แนวตั้ง ➔ แนวนอน</span>
              </>
            ) : (
              <>
                <Rows className="w-3.5 h-3.5 rotate-90 text-blue-400" />
                <span>แนวนอน ➔ แนวตั้ง</span>
              </>
            )}
          </button>

          <button
            onClick={handleRotatePage}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white"
            title="หมุนหน้า 90 องศา"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              onClick={() => handleChangeTemplate("blank")}
              className={`p-1.5 rounded-lg ${currentPage.template === "blank" ? "bg-slate-700 text-white" : "text-slate-400"}`}
              title="กระดาษเปล่า"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleChangeTemplate("ruled")}
              className={`p-1.5 rounded-lg ${currentPage.template === "ruled" ? "bg-slate-700 text-white" : "text-slate-400"}`}
              title="กระดาษมีเส้นบรรทัด"
            >
              <Rows className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleChangeTemplate("grid")}
              className={`p-1.5 rounded-lg ${currentPage.template === "grid" ? "bg-slate-700 text-white" : "text-slate-400"}`}
              title="กระดาษตารางกราฟ"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleChangeTemplate("dotted")}
              className={`p-1.5 rounded-lg ${currentPage.template === "dotted" ? "bg-slate-700 text-white" : "text-slate-400"}`}
              title="กระดาษจุดไข่ปลา"
            >
              <CircleDot className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setIsStylusOnly(!isStylusOnly)}
            className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-[11px] ${
              isStylusOnly
                ? "bg-amber-600/30 text-amber-300 border-amber-500/40"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
            title="โหมด Stylus ปากกาอย่างเดียว เพื่อวางฝ่ามือบนจอได้ (Palm Rejection)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">กันมือโดน (Stylus)</span>
          </button>
        </div>

        {/* Undo, Redo, Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300"
              title="ย้อนกลับ (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300"
              title="ทำซ้ำ (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              onClick={() => setZoom((z) => Math.max(0.35, Number((z - 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white"
              title="ย่อขนาด"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white"
              title="ขยายขนาด"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitWidth}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white text-[10px]"
              title="พอดีความกว้างหน้าจอ"
            >
              Fit
            </button>
          </div>
        </div>
      </div>

      {/* --- MAIN WORKSPACE CANVAS AREA --- */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-auto bg-slate-950 p-2 sm:p-4 md:p-8 flex items-center justify-center relative ${
          tool === "pan" ? "cursor-grab active:cursor-grabbing" : tool === "select" ? "cursor-crosshair" : "cursor-crosshair"
        }`}
      >
        {isLoadingPdf && (
          <div className="absolute inset-0 bg-slate-950/80 z-30 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-sm font-medium text-slate-300">กำลังประมวลผลเอกสาร PDF...</span>
          </div>
        )}

        {/* Paper Container */}
        <div
          className="relative bg-white border border-slate-300 my-auto shadow-md"
          style={{
            width: `${displayWidth * zoom}px`,
            height: `${displayHeight * zoom}px`,
          }}
        >
          {/* Layer 1: PDF Background & Paper Template Canvas */}
          <canvas
            ref={pdfCanvasRef}
            className="absolute inset-0 pointer-events-none"
          />

          {/* Layer 2: Inserted Images Layer */}
          <div className="absolute inset-0 pointer-events-none z-5 overflow-hidden">
            {currentPageImages.map((img) => {
              const isSelected = selectedImageIds.includes(img.id);
              return (
                <div
                  key={img.id}
                  style={{
                    position: "absolute",
                    left: `${img.x * zoom}px`,
                    top: `${img.y * zoom}px`,
                    width: `${img.width * zoom}px`,
                    height: `${img.height * zoom}px`,
                  }}
                  className={`pointer-events-auto ${
                    isSelected ? "ring-2 ring-blue-500" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tool === "select") {
                      setSelectedImageIds([img.id]);
                      setSelectedStrokeIds([]);
                    }
                  }}
                >
                  <img
                    src={img.dataUrl}
                    alt="แทรกรูปภาพ"
                    className="w-full h-full object-contain pointer-events-none select-none"
                    draggable={false}
                  />

                  {/* Corner Resize Handles for selected image */}
                  {isSelected && tool === "select" && selectedImageIds.length === 1 && (
                    <>
                      <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-600 border border-white rounded-full shadow-sm" />
                      <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 border border-white rounded-full shadow-sm" />
                      <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-600 border border-white rounded-full shadow-sm" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 border border-white rounded-full shadow-sm cursor-se-resize" />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Layer 3: Drawing & Annotation Vector Canvas */}
          <canvas
            ref={drawCanvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ touchAction: "none" }}
            className="absolute inset-0 z-10"
          />

          {/* Layer 4: Selection Box & Action Floating Toolbar */}
          {selectionBounds && tool === "select" && (
            <div
              style={{
                position: "absolute",
                left: `${selectionBounds.minX * zoom}px`,
                top: `${selectionBounds.minY * zoom}px`,
                width: `${(selectionBounds.maxX - selectionBounds.minX) * zoom}px`,
                height: `${(selectionBounds.maxY - selectionBounds.minY) * zoom}px`,
              }}
              className="border-2 border-dashed border-blue-500 pointer-events-none z-20"
            >
              {/* Floating Action Pill above selection */}
              <div
                className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-xl shadow-xl text-xs whitespace-nowrap"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1 text-blue-400 font-medium text-[11px] mr-1">
                  <Move className="w-3.5 h-3.5" />
                  <span>ลากย้าย</span>
                </div>
                <button
                  onClick={handleDeleteSelected}
                  className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 text-[11px] font-medium"
                  title="ลบสิ่งที่เลือก"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>ลบ</span>
                </button>
                <button
                  onClick={handleDeselect}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  title="ยกเลิกการเลือก"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- RESPONSIVE MOBILE FLOATING ACTION BAR (< 768px) --- */}
      <div className="flex md:hidden bg-slate-900 border-t border-slate-700 px-2 py-2 items-center justify-around shrink-0 z-40 text-xs">
        <button
          onClick={() => setTool("pen")}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl ${
            tool === "pen" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span className="text-[10px]">ปากกา</span>
        </button>

        <button
          onClick={() => setTool("highlighter")}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl ${
            tool === "highlighter" ? "bg-amber-500 text-slate-950 font-semibold" : "text-slate-400 hover:text-white"
          }`}
        >
          <Highlighter className="w-4 h-4" />
          <span className="text-[10px]">ไฮไลต์</span>
        </button>

        <button
          onClick={() => setTool("eraser")}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl ${
            tool === "eraser" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          <Eraser className="w-4 h-4" />
          <span className="text-[10px]">ยางลบ</span>
        </button>

        <button
          onClick={() => setTool("select")}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl ${
            tool === "select" ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-white"
          }`}
        >
          <BoxSelect className="w-4 h-4" />
          <span className="text-[10px]">วาดคลุม</span>
        </button>

        <button
          onClick={handleImportImageClick}
          className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl text-emerald-400 hover:text-emerald-300"
          title="แทรกรูปภาพ"
        >
          <ImageIcon className="w-4 h-4" />
          <span className="text-[10px]">แทรกรูป</span>
        </button>

        <button
          onClick={handleImportPdfClick}
          className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl text-blue-400 hover:text-blue-300"
          title="นำเข้าไฟล์ PDF"
        >
          <FileUp className="w-4 h-4" />
          <span className="text-[10px]">นำเข้า PDF</span>
        </button>

        <button
          onClick={handleToggleOrientation}
          className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl text-slate-300 hover:text-white"
          title="สลับแนวตั้ง / แนวนอน"
        >
          <Rows className={`w-4 h-4 ${currentPage.orientation === "landscape" ? "rotate-90 text-blue-400" : ""}`} />
          <span className="text-[10px]">หมุนแนว</span>
        </button>

        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl text-slate-400 hover:text-white disabled:opacity-30"
          title="ย้อนกลับ"
        >
          <Undo2 className="w-4 h-4" />
          <span className="text-[10px]">ย้อนกลับ</span>
        </button>
      </div>

      {/* Modal บันทึกสมุดจดดิจิทัลใหม่ — แสดงเฉพาะตอนสร้างสมุดจดครั้งแรก */}
      <SaveDigitalNotebookModal
        isOpen={isSaveModalOpen}
        onClose={() => {
          setIsSaveModalOpen(false);
          shouldCloseAfterSaveRef.current = false;
        }}
        onConfirm={handleSaveModalConfirm}
        initialTitle={currentDisplayTitle}
        categories={categories}
        noteType={noteType}
        isSaving={isSaving}
      />

      {/* Modal ยืนยันเมื่อมีข้อมูลที่ยังไม่ได้บันทึกก่อนปิดหน้าต่าง */}
      {isUnsavedModalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
          onClick={handleCancelClose}
        >
          <div
            className="w-full max-w-md bg-slate-900 text-slate-100 rounded-2xl sm:rounded-3xl border border-slate-700 shadow-2xl p-5 sm:p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Icon */}
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base sm:text-lg text-white leading-tight">
                    ยังไม่ได้บันทึกการเปลี่ยนแปลง
                  </h3>
                  <button
                    type="button"
                    onClick={handleCancelClose}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="ยกเลิก"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                  คุณมีการเขียนหรือแก้ไขเอกสารที่ยังไม่ได้บันทึก คุณต้องการบันทึกก่อนปิดหน้าต่างนี้หรือไม่?
                </p>
              </div>
            </div>

            {/* Actions Button Group */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 text-xs sm:text-sm">
              <button
                type="button"
                onClick={handleCancelClose}
                className="order-3 sm:order-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium transition cursor-pointer text-center"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDiscardAndClose}
                className="order-2 sm:order-2 px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 hover:text-rose-300 font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ไม่บันทึก (ปิดเลย)</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveAndClose}
                className="order-1 sm:order-3 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกและปิด</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
