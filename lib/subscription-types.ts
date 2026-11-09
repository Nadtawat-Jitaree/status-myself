export type UserRole = "member" | "premium";

export interface SubscriptionInfo {
  userId: string;
  role: UserRole;
  effectiveRole: UserRole; // ถ้าหมดอายุจะเป็น 'member'
  plan: "monthly" | "yearly" | null;
  subscribedAt: Date | null;
  expiresAt: Date | null;
  isExpired: boolean;
  isPremium: boolean;
  daysLeft: number | null;
}

/**
 * รายการสิทธิ์การใช้งานสำหรับแสดงผลบน UI Tooltip (Client-safe)
 */
export const ROLE_PERMISSIONS = {
  member: {
    title: "สมาชิกทั่วไป (Member)",
    badgeText: "สมาชิก",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    description: "สิทธิ์เริ่มต้นสำหรับผู้สมัครใหม่ สามารถคอมเมนต์และดูบอร์ดได้",
    can: [
      "คอมเมนต์โน้ตในบอร์ดสาธารณะของผู้อื่น",
      "ส่ง Reaction (ถูกใจ/ไม่ถูกใจ) ในบอร์ด",
      "แก้ไขข้อมูลโปรไฟล์และอวาตาร์ของตนเอง",
      "ดูหน้า Board สาธารณะ",
    ],
    cannot: [
      "ระบบโน้ตทั่วไป (Normal Notes)",
      "ระบบโน้ตมหาวิทยาลัย (School Notes)",
      "ระบบโปรเจกต์ & บอร์ดติดตามงาน (Projects)",
      "ระบบปฏิทิน & Daily Log (Calendar)",
      "ระบบบันทึกทักษะ & แต้มประสบการณ์ (Qualities)",
      "ระบบแดชบอร์ดสรุปผลภาพรวม (Dashboard)",
    ],
  },
  premium: {
    title: "สมาชิกพรีเมี่ยม (Premium)",
    badgeText: "Premium",
    badgeColor:
      "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/30",
    description: "ปลดล็อคเข้าใช้งานระบบและฟีเจอร์ NJ Notes ได้แบบเต็มพิกัด",
    can: [
      "ใช้งานระบบโน้ตทั่วไป และโน้ตมหาวิทยาลัย ไม่จำกัด",
      "สร้างและจัดการโปรเจกต์ งาน และไทม์ไลน์ (Projects)",
      "ใช้งานปฏิทิน จัดตารางงาน และบันทึก Daily Log",
      "ระบบสะสมแต้มทักษะและการพัฒนาตนเอง (Qualities)",
      "วิเคราะห์สถิติความก้าวหน้าใน Dashboard",
      "คอมเมนต์และมีส่วนร่วมใน Board ชุมชน",
      "แก้ไขโปรไฟล์และปรับแต่งหน้าตาได้ตามใจ",
    ],
    cannot: [],
  },
  expired: {
    title: "แพ็กเกจหมดอายุ (Expired)",
    badgeText: "หมดอายุ",
    badgeColor: "bg-rose-50 text-rose-600 border-rose-200",
    description:
      "แพ็กเกจพรีเมี่ยมของคุณหมดอายุแล้ว ฟีเจอร์ต่างๆ จะถูกล็อคจนกว่าจะต่ออายุ",
    can: [
      "คอมเมนต์โน้ตในบอร์ดสาธารณะ",
      "แก้ไขข้อมูลโปรไฟล์ของตนเอง",
      "ดูหน้า Board สาธารณะ",
    ],
    cannot: [
      "ฟีเจอร์ Workspace ทั้งหมด (Notes, Projects, Calendar, Qualities, Dashboard)",
    ],
  },
};
