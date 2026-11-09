"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";

interface NoteTypeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NoteTypeModal({
  open,
  onClose,
}: NoteTypeModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // รองรับการกด Esc เพื่อปิด Modal
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const workspaceItems = [
    {
      title: "โน้ตทั่วไป",
      href: "/system/notes/normal",
      image: "/note.webp",
      hoverBorder: "hover:border-blue-400 hover:shadow-blue-500/15",
      hoverBg: "hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
      textColor: "group-hover:text-blue-600 dark:group-hover:text-blue-400",
      glowBg: "from-blue-500/10 to-transparent",
    },
    {
      title: "โน้ตมหาวิทยาลัย",
      href: "/system/notes/school",
      image: "/school.webp",
      hoverBorder: "hover:border-emerald-400 hover:shadow-emerald-500/15",
      hoverBg: "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
      textColor: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
      glowBg: "from-emerald-500/10 to-transparent",
    },
    {
      title: "โปรเจกต์",
      href: "/system/projects",
      image: "/normal.webp",
      hoverBorder: "hover:border-purple-400 hover:shadow-purple-500/15",
      hoverBg: "hover:bg-purple-50/50 dark:hover:bg-purple-950/20",
      textColor: "group-hover:text-purple-600 dark:group-hover:text-purple-400",
      glowBg: "from-purple-500/10 to-transparent",
    },
    {
      title: "ปฏิทิน",
      href: "/system/calendar",
      image: "/all.webp",
      hoverBorder: "hover:border-amber-400 hover:shadow-amber-500/15",
      hoverBg: "hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
      textColor: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
      glowBg: "from-amber-500/10 to-transparent",
    },
    {
      title: "ทักษะ",
      href: "/system/qualities",
      image: "/skills.png",
      hoverBorder: "hover:border-indigo-400 hover:shadow-indigo-500/15",
      hoverBg: "hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20",
      textColor: "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
      glowBg: "from-indigo-500/10 to-transparent",
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-modal-title"
    >
      <div
        className="relative w-full max-w-3xl rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-md transition-all max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ปุ่มปิดมุมขวาบน */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          aria-label="ปิดหน้าต่าง"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ส่วนหัว Modal สั้นกระชับ ไม่รก */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Workspace</span>
          </div>
          <h2
            id="workspace-modal-title"
            className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            เลือกพื้นที่ทำงาน
          </h2>
        </div>

        {/* Card Grid สไตล์ App Launcher: โลโก้เด่นด้านบน + ชื่ออยู่ข้างล่าง ไม่ซับซ้อน */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 sm:gap-4">
          {workspaceItems.map((item, index) => {
            // เมื่ออยู่บนมือถือ (2 cols) ให้รายการที่ 5 อยู่ตรงกลางกว้างเต็ม 2 ช่อง
            const isLastOdd =
              index === workspaceItems.length - 1 && workspaceItems.length % 2 !== 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group relative flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 transition-all duration-200 hover:shadow-sm active:scale-95 text-center ${
                  item.hoverBorder
                } ${item.hoverBg} ${
                  isLastOdd
                    ? "col-span-2 sm:col-span-1 max-w-[200px] sm:max-w-none mx-auto w-full"
                    : ""
                }`}
              >
                {/* แสงเรืองบางๆ ด้านหลังโลโก้ */}
                <div
                  className={`absolute inset-0 rounded-2xl sm:rounded-3xl bg-radial ${item.glowBg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                />

                {/* โลโก้เด่นชัด ขนาดใหญ่ */}
                <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={80}
                    height={80}
                    className="object-contain drop-shadow-md select-none"
                    unoptimized
                    priority
                  />
                </div>

                {/* ชื่อพื้นที่ทำงาน อยู่ใต้โลโก้ ตัวหนา ชัดเจน */}
                <span
                  className={`mt-3 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors ${item.textColor}`}
                >
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>

        {/* ปุ่มปิดด้านล่าง เรียบง่าย */}
        <div className="mt-7 text-center">
          <button
            onClick={onClose}
            className="rounded-xl px-6 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
