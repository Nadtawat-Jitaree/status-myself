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
