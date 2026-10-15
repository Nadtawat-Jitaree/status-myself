"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X, Sparkles, FileText, GraduationCap, FolderKanban } from "lucide-react";

interface NoteTypeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NoteTypeModal({
  open,
  onClose,
}: NoteTypeModalProps) {
  if (!open) return null;

  const menuItems = [
    {
      title: "โน้ตทั่วไป",
      description: "บันทึกข้อความ ไอเดีย และงานทั่วไปในชีวิตประจำวัน",
      href: "/system/notes/normal",
      image: "/note.webp",
      tag: "Personal & Work",
      color: "blue",
      borderHover: "hover:border-blue-500/50 hover:shadow-blue-500/5",
      bgHover: "hover:bg-blue-50/50",
      iconBg: "bg-blue-100/80 text-blue-600",
      tagColor: "bg-blue-50 text-blue-700 border-blue-200/60",
    },
    {
      title: "โน้ตมหาวิทยาลัย",
      description: "จัดการบันทึกวิชาเรียน การบ้าน รายงาน และตารางสอบ",
      href: "/system/notes/school",
      image: "/school.webp",
      tag: "Education & Study",
      color: "emerald",
      borderHover: "hover:border-emerald-500/50 hover:shadow-emerald-500/5",
      bgHover: "hover:bg-emerald-50/50",
      iconBg: "bg-emerald-100/80 text-emerald-600",
      tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    },
    {
      title: "โปรเจกต์ & ภารกิจ",
      description: "ติดตามความคืบหน้ารายงาน โปรเจกต์ และขั้นตอนการทำงาน",
      href: "/system/projects",
      image: "/normal.webp",
      tag: "Task Tracking",
      color: "purple",
      borderHover: "hover:border-purple-500/50 hover:shadow-purple-500/5",
      bgHover: "hover:bg-purple-50/50",
      iconBg: "bg-purple-100/80 text-purple-600",
      tagColor: "bg-purple-50 text-purple-700 border-purple-200/60",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border bg-card p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="ปิด"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            เลือกพื้นที่ทำงาน
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            เลือกประเภทบันทึกหรือโปรเจกต์ที่คุณต้องการเข้าใช้งาน
          </p>
        </div>

        {/* Menu Items */}
        <div className="space-y-3.5">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`group relative flex items-center gap-4 rounded-2xl border bg-card/60 p-4  hover:shadow-md ${item.borderHover} ${item.bgHover}`}
            >
              {/* Icon Container */}
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl p-2 ${item.iconBg}`}
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  width={36}
                  height={36}
                  style={{ width: "auto", height: "auto" }}
                  unoptimized
                />
              </div>

              {/* Text Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </span>
                  <span
                    className={`hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.tagColor}`}
                  >
                    {item.tag}
                  </span>
                </div>

                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {item.description}
                </p>
              </div>

              {/* Arrow Icon */}
              <div className="shrink-0 text-muted-foreground/60 transition-all duration-200 group-hover:text-primary">
                <ArrowRight className="w-5 h-5" />
              </div>
            </Link>
          ))}
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl border bg-background py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}