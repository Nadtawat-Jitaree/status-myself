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
    <div className="flex items-center justify-between md:justify-start w-full md:w-auto gap-2 sm:gap-3">
      {/* ── โลโก้ (ชิดซ้ายบน Mobile) ── */}
      {/* Mobile: icon only (ประหยัด space ให้ label เมนูแสดงได้) */}
      {/* sm+: icon + ชื่อ NJ Notes */}
      <Link
        href="/"
        className="group flex items-center gap-2 transition-opacity hover:opacity-90 shrink-0"
      >
        <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-slate-50 p-1 border border-slate-200/70 shadow-xs transition-transform duration-200 group-hover:scale-105">
          <Image
            src="/logo.png"
            alt="NJ Notes"
            width={32}
            height={32}
            className="object-contain"
            priority
          />
        </div>
        <div className="hidden sm:flex flex-col leading-none">
          <span className="text-sm font-bold tracking-tight text-slate-800">
            NJ Notes
          </span>
          <span className="text-[10px] font-medium text-slate-400 mt-0.5">
            Workspace
          </span>
        </div>
      </Link>

      {/* เส้นคั่น (แสดงบน Desktop หรือ sm ขึ้นไป) */}
      <div className="hidden md:block h-5 w-px bg-slate-200" />

      {/* ── เมนูนำทาง (ชิดขวาบน Mobile ด้วย justify-between หรือ ml-auto) ── */}
      {/* label แสดงทุก breakpoint เพราะ Logo icon เป็น anchor แล้ว space เหลือพอ */}
      <nav className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Dashboard */}
        {isPremium ? (
          <Link
            href="/system/dashboard"
            title="Dashboard"
            className={`flex h-9 items-center gap-1.5 rounded-xl px-2 sm:px-3 text-xs font-semibold transition-all duration-150 active:scale-95 ${
              pathname.startsWith("/system/dashboard")
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30 border border-transparent"
                : "text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60"
            }`}
          >
            <BarChart3 className="h-[15px] w-[15px] shrink-0" />
            <span>Dashboard</span>
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Dashboard — Premium เท่านั้น"
            className="relative flex h-9 items-center justify-center rounded-md px-2 sm:px-3 text-xs font-semibold border border-slate-200/70 bg-slate-100/60 cursor-not-allowed select-none overflow-hidden"
          >
            <div className="flex items-center gap-1.5 opacity-20 grayscale pointer-events-none">
              <BarChart3 className="h-[15px] w-[15px] shrink-0" />
              <span>Dashboard</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-300/40">
                <Lock className="w-3 h-3" />
              </div>
            </div>
          </button>
        )}

        {/* Board */}
        <Link
          href="/board"
          title="Board กระดานสนทนา"
          className={`flex h-9 items-center gap-1.5 rounded-xl px-2 sm:px-3 text-xs font-semibold transition-all duration-150 active:scale-95 ${
            pathname.startsWith("/board")
              ? "bg-rose-600 text-white shadow-sm shadow-rose-500/30 border border-transparent"
              : "text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/60"
          }`}
        >
          <MessagesSquare className="h-[15px] w-[15px] shrink-0" />
          <span>Board</span>
        </Link>

        {/* Menus / Workspace */}
        {isPremium ? (
          <button
            type="button"
            onClick={() => setOpenModalNavbar(true)}
            className={`group relative flex h-9 items-center gap-1.5 rounded-md px-2 sm:px-3 text-xs font-semibold transition-all duration-150 active:scale-95 ${
              isWorkspaceActive
                ? "bg-purple-600 text-white shadow-sm shadow-purple-500/30 border border-transparent"
                : "text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/60"
            }`}
            title="เลือกพื้นที่ทำงาน"
          >
            <LayoutGrid className="h-[15px] w-[15px] shrink-0" />
            <span>Menus</span>
            {/* dot indicator */}
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                isWorkspaceActive ? "bg-white/80" : "bg-purple-400"
              }`}
            />
          </button>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Menus — Premium เท่านั้น"
            className="relative flex h-9 items-center justify-center rounded-md px-2 sm:px-3 text-xs font-semibold border border-slate-200/70 bg-slate-100/60 cursor-not-allowed select-none overflow-hidden"
          >
            <div className="flex items-center gap-1.5 opacity-20 grayscale pointer-events-none">
              <LayoutGrid className="h-[15px] w-[15px] shrink-0" />
              <span>Menus</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-300/40">
                <Lock className="w-3 h-3" />
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
