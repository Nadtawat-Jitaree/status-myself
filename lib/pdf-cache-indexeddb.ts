"use client";

import { DocumentAnnotationState } from "./pdf-canvas/types";

const DB_NAME = "nj_notes_pdf_db";
const DB_VERSION = 1;
const STORE_PDF_BUFFERS = "pdf_buffers";
const STORE_ANNOTATIONS = "annotations";

interface CachedPdfRecord {
  key: string; // noteId or file_path or url
  buffer: ArrayBuffer;
  updatedAt: number;
}

interface CachedAnnotationRecord {
  noteId: string;
  annotation: DocumentAnnotationState;
  updatedAt: number;
}

/**
 * Open or create IndexedDB instance
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PDF_BUFFERS)) {
        db.createObjectStore(STORE_PDF_BUFFERS, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_ANNOTATIONS)) {
        db.createObjectStore(STORE_ANNOTATIONS, { keyPath: "noteId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Cache PDF ArrayBuffer in IndexedDB (Supports large files up to GBs without 5MB quota errors)
 */
export async function cachePdfBuffer(key: string, buffer: ArrayBuffer): Promise<void> {
  if (!key || !buffer) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PDF_BUFFERS, "readwrite");
      const store = tx.objectStore(STORE_PDF_BUFFERS);
      const record: CachedPdfRecord = {
        key,
        buffer,
        updatedAt: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] Failed to cache PDF buffer:", err);
  }
}

/**
 * Get cached PDF ArrayBuffer from IndexedDB
 */
export async function getCachedPdfBuffer(key: string): Promise<ArrayBuffer | null> {
  if (!key) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PDF_BUFFERS, "readonly");
      const store = tx.objectStore(STORE_PDF_BUFFERS);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result as CachedPdfRecord | undefined;
        resolve(result?.buffer || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] Failed to get cached PDF buffer:", err);
    return null;
  }
}

/**
 * Cache Note Annotations (strokes, images, pages) in IndexedDB
 */
export async function cacheNoteAnnotation(
  noteId: string,
  annotation: DocumentAnnotationState
): Promise<void> {
  if (!noteId || !annotation) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ANNOTATIONS, "readwrite");
      const store = tx.objectStore(STORE_ANNOTATIONS);
      const record: CachedAnnotationRecord = {
        noteId,
        annotation,
        updatedAt: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] Failed to cache note annotation:", err);
  }
}

/**
 * Get cached Note Annotations from IndexedDB
 */
export async function getCachedNoteAnnotation(
  noteId: string
): Promise<DocumentAnnotationState | null> {
  if (!noteId) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ANNOTATIONS, "readonly");
      const store = tx.objectStore(STORE_ANNOTATIONS);
      const req = store.get(noteId);
      req.onsuccess = () => {
        const result = req.result as CachedAnnotationRecord | undefined;
        resolve(result?.annotation || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] Failed to get cached annotation:", err);
    return null;
  }
}

/**
 * Remove cached PDF and Annotation for a note (e.g. when note is deleted)
 */
export async function removeCachedNote(noteId: string, filePath?: string | null): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_PDF_BUFFERS, STORE_ANNOTATIONS], "readwrite");
    const annoStore = tx.objectStore(STORE_ANNOTATIONS);
    annoStore.delete(noteId);

    const pdfStore = tx.objectStore(STORE_PDF_BUFFERS);
    pdfStore.delete(noteId);
    if (filePath) {
      pdfStore.delete(filePath);
    }
  } catch (err) {
    console.warn("[IndexedDB] Failed to remove cached note:", err);
  }
}
