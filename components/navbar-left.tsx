"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutGrid, MessagesSquare } from "lucide-react";
import NoteTypeModal from "./NoteTypeModal";

export function NavbarLeft() {
  const [openModalNavbar, setOpenModalNavbar] = useState(false);
  const pathname = usePathname();

  // ไฮไลท์ปุ่ม Menus เมื่อกำลังอยู่ในพื้นที่ทำงานใดๆ
  const isWorkspaceActive =
    pathname.startsWith("/system/notes") ||
    pathname.startsWith("/system/projects") ||
    pathname.startsWith("/system/calendar") ||
    pathname.startsWith("/system/qualities");

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
      title: "Board",
      href: "/board",
      icon: MessagesSquare,
      color: "text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border-rose-200/50",
      activeColor: "bg-rose-600 text-white shadow-sm shadow-rose-500/30",
      isActive: pathname.startsWith("/board"),
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

      {/* เมนูนำทาง (Menus, Dashboard, Board) */}
      <nav className="flex items-center gap-1.5 sm:gap-2">
        {/* ปุ่มเมนูพื้นที่ทำงาน (เปิด Modal) */}
        <button
          type="button"
          onClick={() => setOpenModalNavbar(true)}
          className={`group relative flex h-10 items-center gap-2 rounded-2xl px-2.5 sm:px-3 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-xs ${
            isWorkspaceActive
              ? "bg-purple-600 text-white shadow-sm shadow-purple-500/30 border border-transparent"
              : "text-purple-700 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-200/60"
          }`}
          title="เลือกพื้นที่ทำงาน (Menus)"
        >
          <LayoutGrid className="h-[18px] w-[18px] transition-transform duration-200 group-hover:rotate-12" />
          <span className="hidden md:inline-block">Menus</span>
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
                isWorkspaceActive ? "bg-white/80" : "bg-purple-400"
              } opacity-75`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                isWorkspaceActive ? "bg-white" : "bg-purple-500"
              }`}
            />
          </span>
        </button>

        {/* เมนูนำทางตามเส้นทางหลัก (Dashboard, Board) */}
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

      {/* Modal เลือกพื้นที่ทำงาน */}
      <NoteTypeModal
        open={openModalNavbar}
        onClose={() => setOpenModalNavbar(false)}
      />
    </div>
  );
}
