"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutGrid, MessagesSquare, Lock } from "lucide-react";
import NoteTypeModal from "./NoteTypeModal";
import { getUserSubscriptionAction } from "@/app/actions/subscription";
import type { SubscriptionInfo } from "@/lib/subscription-types";

export function NavbarLeft() {
  const [openModalNavbar, setOpenModalNavbar] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    getUserSubscriptionAction()
      .then((res) => setSubscription(res))
      .catch(() => setSubscription(null));
  }, [pathname]);

  const isPremium = subscription?.isPremium ?? false;

  // ไฮไลท์ปุ่ม Menus เมื่อกำลังอยู่ในพื้นที่ทำงานใดๆ
  const isWorkspaceActive =
    pathname.startsWith("/system/notes") ||
    pathname.startsWith("/system/projects") ||
    pathname.startsWith("/system/calendar") ||
    pathname.startsWith("/system/qualities");

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

      {/* เมนูนำทาง (Dashboard, Board, Menus) */}
      <nav className="flex items-center gap-1.5 sm:gap-2">
        {/* เมนู Dashboard */}
        {isPremium ? (
          <Link
            href="/system/dashboard"
            title="Dashboard"
            className={`flex h-10 items-center gap-2 rounded-2xl px-2.5 sm:px-3 text-xs font-semibold transition-colors duration-150 active:scale-95 ${
              pathname.startsWith("/system/dashboard")
                ? "bg-blue-600 text-white shadow-xs border border-transparent"
                : "text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 border-blue-200/50 border"
            }`}
          >
            <BarChart3 className="h-[18px] w-[18px]" />
            <span className="hidden md:inline-block">Dashboard</span>
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Dashboard (สงวนสิทธิ์เฉพาะสมาชิก Premium เท่านั้น)"
            className="relative flex h-10 items-center justify-center rounded-2xl px-2.5 sm:px-3 text-xs font-semibold border border-slate-200/70 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 cursor-not-allowed select-none overflow-hidden"
          >
            {/* เนื้อหาเดิม */}
            <div className="flex items-center gap-2 opacity-25 grayscale select-none pointer-events-none">
              <BarChart3 className="h-[18px] w-[18px]" />
              <span className="hidden md:inline-block">Dashboard</span>
            </div>
            {/* Icon กุญแจล็อคตรงกลาง */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/15 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-300/40 dark:border-amber-500/30">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>
          </button>
        )}

        {/* เมนู Board (สมาชิกทั่วไปใช้งานได้ตาม Requirement) */}
        <Link
          href="/board"
          title="Board กระดานสนทนา"
          className={`flex h-10 items-center gap-2 rounded-2xl px-2.5 sm:px-3 text-xs font-semibold transition-colors duration-150 active:scale-95 ${
            pathname.startsWith("/board")
              ? "bg-rose-600 text-white shadow-xs border border-transparent"
              : "text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border-rose-200/50 border"
          }`}
        >
          <MessagesSquare className="h-[18px] w-[18px]" />
          <span className="hidden md:inline-block">Board</span>
        </Link>

        {/* ปุ่มเมนูพื้นที่ทำงาน (เปิด Modal) */}
        {isPremium ? (
          <button
            type="button"
            onClick={() => setOpenModalNavbar(true)}
            className={`group relative flex h-10 items-center gap-2 rounded-2xl px-2.5 sm:px-3 text-xs font-semibold transition-colors duration-150 active:scale-95 ${
              isWorkspaceActive
                ? "bg-purple-600 text-white shadow-xs border border-transparent"
                : "text-purple-700 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-200/60"
            }`}
            title="เลือกพื้นที่ทำงาน (Menus)"
          >
            <LayoutGrid className="h-[18px] w-[18px]" />
            <span className="hidden md:inline-block">Menus</span>
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isWorkspaceActive ? "bg-white" : "bg-purple-500"
              }`}
            />
          </button>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Menus (สงวนสิทธิ์เฉพาะสมาชิก Premium เท่านั้น)"
            className="relative flex h-10 items-center justify-center rounded-2xl px-2.5 sm:px-3 text-xs font-semibold border border-slate-200/70 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 cursor-not-allowed select-none overflow-hidden"
          >
            {/* เนื้อหาเดิม */}
            <div className="flex items-center gap-2 opacity-25 grayscale select-none pointer-events-none">
              <LayoutGrid className="h-[18px] w-[18px]" />
              <span className="hidden md:inline-block">Menus</span>
            </div>
            {/* Icon กุญแจล็อคตรงกลาง */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/15 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-300/40 dark:border-amber-500/30">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>
          </button>
        )}
      </nav>

      {/* Modal เลือกพื้นที่ทำงาน */}
      <NoteTypeModal
        open={openModalNavbar}
        onClose={() => setOpenModalNavbar(false)}
        subscription={subscription}
      />
    </div>
  );
}
