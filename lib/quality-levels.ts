/**
 * ระบบ Level ทักษะ — 10 ระดับ (ภาษาไทย)
 * ออกแบบให้การสะสมแต้มในช่วงแรกรู้สึกก้าวหน้าเร็ว
 * และยิ่งระดับสูงยิ่งท้าทายมากขึ้นตามธรรมชาติ
 */
export interface LevelInfo {
  level: number;        // ระดับ 1-10
  name: string;         // ชื่อระดับ
  emoji: string;        // อีโมจิประจำระดับ
  minPoints: number;    // แต้มขั้นต่ำสำหรับระดับนี้
  maxPoints: number;    // แต้มสูงสุดก่อนขึ้นระดับถัดไป (-1 = ไม่มีสิ้นสุด)
  color: string;        // สีประจำระดับ (Tailwind class)
  bgColor: string;      // สีพื้นหลัง Badge
}

export const QUALITY_LEVELS: LevelInfo[] = [
  { level: 1,  name: "มือใหม่",         emoji: "🌱", minPoints: 0,    maxPoints: 19,    color: "text-zinc-600",    bgColor: "bg-zinc-100 dark:bg-zinc-800" },
  { level: 2,  name: "ผู้ฝึกหัด",       emoji: "🔰", minPoints: 20,   maxPoints: 49,    color: "text-green-700",   bgColor: "bg-green-100 dark:bg-green-950/50" },
  { level: 3,  name: "ผู้พัฒนา",        emoji: "⚡",  minPoints: 50,   maxPoints: 99,    color: "text-teal-700",    bgColor: "bg-teal-100 dark:bg-teal-950/50" },
  { level: 4,  name: "ผู้ชำนาญ",        emoji: "🎯", minPoints: 100,  maxPoints: 179,   color: "text-blue-700",    bgColor: "bg-blue-100 dark:bg-blue-950/50" },
  { level: 5,  name: "ผู้เชี่ยวชาญ",   emoji: "🏅", minPoints: 180,  maxPoints: 299,   color: "text-indigo-700",  bgColor: "bg-indigo-100 dark:bg-indigo-950/50" },
  { level: 6,  name: "ระดับสูง",        emoji: "🌟", minPoints: 300,  maxPoints: 449,   color: "text-purple-700",  bgColor: "bg-purple-100 dark:bg-purple-950/50" },
  { level: 7,  name: "ระดับสูงสุด",      emoji: "🏆", minPoints: 450,  maxPoints: 649,   color: "text-orange-700",  bgColor: "bg-orange-100 dark:bg-orange-950/50" },
  { level: 8,  name: "ระดับมาสเตอร์",  emoji: "👑", minPoints: 650,  maxPoints: 999,   color: "text-red-700",     bgColor: "bg-red-100 dark:bg-red-950/50" },
  { level: 9,  name: "แกรนด์มาสเตอร์", emoji: "💎", minPoints: 1000,  maxPoints: 9999,  color: "text-rose-700",    bgColor: "bg-rose-100 dark:bg-rose-950/50" },
  { level: 10, name: "ระดับตำนาน",      emoji: "🔥", minPoints: 10000, maxPoints: -1,    color: "text-amber-700",   bgColor: "bg-amber-100 dark:bg-amber-950/50" },
];

/**
 * หา LevelInfo จากจำนวนแต้ม
 */
export function getLevelInfo(points: number): LevelInfo {
  // หาระดับสูงสุดที่ points >= minPoints
  let result = QUALITY_LEVELS[0];
  for (const lvl of QUALITY_LEVELS) {
    if (points >= lvl.minPoints) {
      result = lvl;
    }
  }
  return result;
}

/**
 * คำนวณ % ความคืบหน้าในระดับปัจจุบัน (0-100)
 */
export function getLevelProgress(points: number): number {
  const info = getLevelInfo(points);
  if (info.maxPoints === -1) return 100; // Level Max
  const range = info.maxPoints - info.minPoints + 1;
  const earned = points - info.minPoints;
  return Math.min(100, Math.round((earned / range) * 100));
}

/**
 * แต้มที่ต้องการเพื่อขึ้น Level ถัดไป
 */
export function getPointsToNextLevel(points: number): number | null {
  const info = getLevelInfo(points);
  if (info.maxPoints === -1) return null; // Max level
  return info.maxPoints + 1 - points;
}
