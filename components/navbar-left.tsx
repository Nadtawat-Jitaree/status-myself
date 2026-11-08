"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { CalendarDays, BarChart3, LayoutGrid, Award } from "lucide-react";
import NoteTypeModal from "./NoteTypeModal";

export function NavbarLeft() {
  const [openModalNavbar, setOpenModalNavbar] = useState(false);
  const pathname = usePathname();

  const isNotesActive =
    pathname.startsWith("/system/notes") ||
    pathname.startsWith("/system/projects");

  const navItems = [
    {
      title: "Dashboard",
      href: "/system/dashboard",
      icon: BarChart3,
      color: "text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 border-blue-200/50",
      activeColor: "bg-blue-600 text-white shadow-sm shadow-blue-500/30",
      isActive: pathname.startsWith("/system/dashboard"),
    },
    {
      title: "Calendar",
      href: "/system/calendar",
      icon: CalendarDays,
      color: "text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 border-amber-200/50",
      activeColor: "bg-amber-500 text-white shadow-sm shadow-amber-500/30",
      isActive: pathname.startsWith("/system/calendar"),
    },
    {
      title: "Skill",
      href: "/system/qualities",
      icon: Award,
      color: "text-indigo-600 bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-200/50",
      activeColor: "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30",
      isActive: pathname.startsWith("/system/qualities"),
    },
  ];

  return (
    <div className="flex items-center gap-2 sm:gap-3.5">
      {/* โลโก้และชื่อเว็บ */}
      <Link
        href="/"
        className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
      >
        <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 p-1 border border-slate-200/70 shadow-xs transition-transform duration-200 group-hover:scale-105">
          <Image
            src="/logo.png"
            alt="NJ Notes"
            width={36}
            height={36}
            className="object-contain"
            priority
          />
        </div>
        <div className="hidden sm:flex flex-col">
          <span className="text-sm font-bold tracking-tight text-slate-800 leading-none">
            NJ Notes
          </span>
          <span className="text-[10px] font-medium text-slate-400 leading-tight mt-0.5">
            Workspace
          </span>
        </div>
      </Link>

      {/* เส้นคั่นแบ่งหมวดหมู่ */}
      <div className="hidden h-6 w-px bg-slate-200/80 sm:block" />

      {/* เมนูนำทาง */}
      <nav className="flex items-center gap-1.5 sm:gap-2">
        {/* ปุ่มเมนูโน้ต (เปิด Modal) */}
        <button
          type="button"
          onClick={() => setOpenModalNavbar(true)}
          className={`group relative flex h-10 items-center gap-2 rounded-2xl px-2.5 sm:px-3 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-xs ${
            isNotesActive
              ? "bg-purple-600 text-white shadow-sm shadow-purple-500/30 border border-transparent"
              : "text-purple-700 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-200/60"
          }`}
          title="เมนูโน้ต & งานทั้งหมด"
        >
          <LayoutGrid className="h-[18px] w-[18px] transition-transform duration-200 group-hover:rotate-12" />
          <span className="hidden md:inline-block">Menus</span>
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
                isNotesActive ? "bg-white/80" : "bg-purple-400"
              } opacity-75`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                isNotesActive ? "bg-white" : "bg-purple-500"
              }`}
            />
          </span>
        </button>

        {/* เมนูนำทางตามเส้นทางหลัก */}
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.title}
              className={`flex h-10 items-center gap-2 rounded-2xl px-2.5 sm:px-3 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                item.isActive
                  ? `${item.activeColor} border border-transparent`
                  : `${item.color} border`
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="hidden md:inline-block">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Note Modal */}
      <NoteTypeModal
        open={openModalNavbar}
        onClose={() => setOpenModalNavbar(false)}
      />
    </div>
  );
}
