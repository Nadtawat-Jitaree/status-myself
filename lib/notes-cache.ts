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
const CACHE_FRESH_MS = 30 * 1000;    // 30 วินาที: ถือว่าสดใหม่ ไม่ต้อง refetch
const CACHE_STALE_MS = 5 * 60 * 1000; // 5 นาที: ถือว่า stale ใช้แสดงผลได้ทันทีแต่ควร background revalidate

/**
 * ดึงสถานะของแคช:
 * - 'fresh': ข้อมูลใหม่ล่าสุด (< 30s) ไม่ต้องยิงเน็ต
 * - 'stale': ข้อมูลพร้อมใช้ได้ทันที (30s - 5m) และแนะนำให้ background sync
 * - 'invalid': ไม่มีแคชหรือเก่าเกิน 5 นาที
 */
export function getCacheState(noteType: string): "fresh" | "stale" | "invalid" {
  const entry = notesMemoryCache.get(noteType);
  if (!entry) return "invalid";
  const age = Date.now() - entry.timestamp;
  if (age < CACHE_FRESH_MS) return "fresh";
  if (age < CACHE_STALE_MS) return "stale";
  return "invalid";
}

/**
 * ดึงข้อมูลโน้ตจาก In-Memory Cache (ความเร็ว O(1) ใช้เวลา ~0ms)
 */
export function getCachedNotes(noteType: string): CachedNotesData | null {
  const entry = notesMemoryCache.get(noteType);
  if (!entry) return null;
  return entry.data;
}

/**
 * ตรวจสอบว่าแคชยังสดใหม่อยู่หรือไม่ (Backward compatible)
 */
export function isCacheFresh(noteType: string): boolean {
  const entry = notesMemoryCache.get(noteType);
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_FRESH_MS;
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
