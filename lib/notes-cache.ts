"use client";

export interface CachedNotesData {
  categories: any[];
  notes: any[];
}

interface CacheEntry {
  data: CachedNotesData;
  timestamp: number;
}

// In-Memory Hash Map สำหรับแคชข้อมูลหน้า Notes ในหน่วยความจำของเบราว์เซอร์
const notesMemoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // อายุแคช 60 วินาที

/**
 * ดึงข้อมูลโน้ตจาก In-Memory Cache (ความเร็ว O(1) ใช้เวลา ~0ms)
 */
export function getCachedNotes(noteType: string): CachedNotesData | null {
  const entry = notesMemoryCache.get(noteType);
  if (!entry) return null;
  return entry.data;
}

/**
 * ตรวจสอบว่าแคชยังสดใหม่อยู่หรือไม่
 */
export function isCacheFresh(noteType: string): boolean {
  const entry = notesMemoryCache.get(noteType);
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/**
 * บันทึกข้อมูลลง In-Memory Cache
 */
export function setCachedNotes(noteType: string, data: CachedNotesData): void {
  notesMemoryCache.set(noteType, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * ล้างแคชเมื่อมีการสร้าง, แก้ไข, ลบ หรือปักหมุด เพื่อให้ข้อมูลตรงกับฐานข้อมูลเสมอ
 */
export function invalidateNotesCache(noteType?: string): void {
  if (noteType) {
    notesMemoryCache.delete(noteType);
  } else {
    notesMemoryCache.clear();
  }
}

export interface CachedNoteQuality {
  quality_id: string;
  level: 1 | 3 | 5;
}

interface NoteQualitiesCacheEntry {
  data: CachedNoteQuality[];
  timestamp: number;
}

// In-Memory Hash Map สำหรับแคชข้อมูล Note Qualities (ความเร็ว O(1) ~0ms)
const noteQualitiesMemoryCache = new Map<string, NoteQualitiesCacheEntry>();
const QUALITIES_CACHE_TTL_MS = 60 * 1000;

/**
 * ดึง Note Qualities จากแคช (ความเร็ว O(1) ใช้เวลา ~0ms)
 */
export function getCachedNoteQualities(noteId: string): CachedNoteQuality[] | null {
  const entry = noteQualitiesMemoryCache.get(noteId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > QUALITIES_CACHE_TTL_MS) {
    noteQualitiesMemoryCache.delete(noteId);
    return null;
  }
  return entry.data;
}

/**
 * บันทึก Note Qualities ลงแคช
 */
export function setCachedNoteQualities(noteId: string, data: CachedNoteQuality[]): void {
  noteQualitiesMemoryCache.set(noteId, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * ลบแคช Note Qualities เมื่อบันทึกหรือลบ
 */
export function invalidateNoteQualitiesCache(noteId?: string): void {
  if (noteId) {
    noteQualitiesMemoryCache.delete(noteId);
  } else {
    noteQualitiesMemoryCache.clear();
  }
}
