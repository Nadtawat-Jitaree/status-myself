export interface AvatarPreset {
  name: string;
  label: string;
  bgGradient: string;
  color: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { name: "User", label: "บุคคลทั่วไป", bgGradient: "from-blue-500 to-indigo-600", color: "#ffffff" },
  { name: "Smile", label: "ยิ้มสดใส", bgGradient: "from-amber-400 to-orange-500", color: "#ffffff" },
  { name: "Sparkles", label: "เปล่งประกาย", bgGradient: "from-yellow-400 to-amber-500", color: "#ffffff" },
  { name: "Bot", label: "เอไอ / บอท", bgGradient: "from-cyan-500 to-blue-600", color: "#ffffff" },
  { name: "Cat", label: "น้องแมว", bgGradient: "from-pink-400 to-rose-500", color: "#ffffff" },
  { name: "Dog", label: "น้องหมา", bgGradient: "from-amber-500 to-orange-600", color: "#ffffff" },
  { name: "Crown", label: "มงกุฎผู้นำ", bgGradient: "from-yellow-500 to-amber-600", color: "#ffffff" },
  { name: "Flame", label: "ไฟแรง", bgGradient: "from-rose-500 to-red-600", color: "#ffffff" },
  { name: "Zap", label: "สายฟ้าพลังงาน", bgGradient: "from-amber-400 to-yellow-500", color: "#ffffff" },
  { name: "Star", label: "ดวงดาว", bgGradient: "from-yellow-400 to-orange-500", color: "#ffffff" },
  { name: "Heart", label: "หัวใจอบอุ่น", bgGradient: "from-rose-400 to-pink-600", color: "#ffffff" },
  { name: "Rocket", label: "จรวดก้าวหน้า", bgGradient: "from-indigo-500 to-purple-600", color: "#ffffff" },
  { name: "Coffee", label: "คอกาแฟ", bgGradient: "from-amber-700 to-stone-800", color: "#ffffff" },
  { name: "GraduationCap", label: "นักวิชาการ", bgGradient: "from-blue-600 to-slate-800", color: "#ffffff" },
  { name: "Glasses", label: "เด็กเนิร์ด", bgGradient: "from-teal-500 to-emerald-600", color: "#ffffff" },
  { name: "Laptop", label: "วัยทำงาน / ดิจิทัล", bgGradient: "from-slate-600 to-slate-900", color: "#ffffff" },
  { name: "Code", label: "โปรแกรมเมอร์", bgGradient: "from-emerald-500 to-teal-700", color: "#ffffff" },
  { name: "Camera", label: "ช่างภาพ", bgGradient: "from-purple-500 to-indigo-700", color: "#ffffff" },
  { name: "Music", label: "คนรักดนตรี", bgGradient: "from-pink-500 to-purple-600", color: "#ffffff" },
  { name: "Palette", label: "ศิลปินครีเอเตอร์", bgGradient: "from-fuchsia-500 to-pink-600", color: "#ffffff" },
  { name: "Gamepad2", label: "เกมเมอร์", bgGradient: "from-violet-600 to-indigo-700", color: "#ffffff" },
  { name: "Trophy", label: "ผู้ชนะ", bgGradient: "from-amber-400 to-yellow-600", color: "#ffffff" },
  { name: "Sun", label: "พระอาทิตย์เบิกบาน", bgGradient: "from-orange-400 to-amber-500", color: "#ffffff" },
  { name: "Moon", label: "พระจันทร์สงบ", bgGradient: "from-indigo-600 to-slate-900", color: "#ffffff" },
  { name: "Compass", label: "นักเดินทาง", bgGradient: "from-blue-500 to-teal-600", color: "#ffffff" },
  { name: "Mountain", label: "สายลุยภูเขา", bgGradient: "from-emerald-600 to-slate-800", color: "#ffffff" },
  { name: "Bike", label: "นักปั่น", bgGradient: "from-sky-500 to-blue-600", color: "#ffffff" },
  { name: "Dumbbell", label: "สายฟิตเนส", bgGradient: "from-red-500 to-rose-700", color: "#ffffff" },
  { name: "Feather", label: "ขนนกอิสระ", bgGradient: "from-purple-400 to-indigo-600", color: "#ffffff" },
  { name: "Leaf", label: "สายธรรมชาติ", bgGradient: "from-green-500 to-emerald-700", color: "#ffffff" },
  { name: "Ghost", label: "กวนๆ ลึกลับ", bgGradient: "from-purple-600 to-slate-800", color: "#ffffff" },
  { name: "Apple", label: "รักสุขภาพ", bgGradient: "from-red-500 to-rose-600", color: "#ffffff" },
];

export function getPresetByName(name?: string | null): AvatarPreset {
  if (!name) return AVATAR_PRESETS[0];
  const found = AVATAR_PRESETS.find((p) => p.name.toLowerCase() === name.toLowerCase());
  return found || AVATAR_PRESETS[0];
}
