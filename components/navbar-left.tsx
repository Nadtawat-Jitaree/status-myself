"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, LayoutGrid, MessagesSquare, Lock } from "lucide-react";
import Swal from "sweetalert2";
import NoteTypeModal from "./NoteTypeModal";
import { getUserSubscriptionAction } from "@/app/actions/subscription";
import type { SubscriptionInfo } from "@/lib/subscription-types";

export function NavbarLeft() {
  const [openModalNavbar, setOpenModalNavbar] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const pathname = usePathname();
  const router = useRouter();

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

  const handleDashboardClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    let currentIsPremium = isPremium;
    // ป้องกัน race condition กรณีเพิ่งอัปเกรดหรือ state ยังไม่พร้อม
    if (!currentIsPremium) {
      const freshSub = await getUserSubscriptionAction().catch(() => null);
      if (freshSub?.isPremium) {
        setSubscription(freshSub);
        return;
      }
    }

    if (!currentIsPremium) {
      e.preventDefault();
      Swal.fire({
        icon: "warning",
        title: "ฟีเจอร์สำหรับสมาชิก Premium",
        html: `<div class="text-sm text-slate-600 space-y-2">
          <p>หน้าระบบ <b>Dashboard</b> สงวนสิทธิ์สำหรับสมาชิก <b>Premium</b> เท่านั้น</p>
          <p class="text-xs text-slate-500">อัปเกรดเพื่อดูสถิติภาพรวม วิเคราะห์ความก้าวหน้า และบันทึกทั้งหมดของคุณ</p>
        </div>`,
        showCancelButton: true,
        confirmButtonText: "ดูแพ็กเกจ Premium",
        cancelButtonText: "ไว้คราวหลัง",
        confirmButtonColor: "#f59e0b",
        cancelButtonColor: "#94a3b8",
        customClass: {
          popup: "rounded-3xl",
          confirmButton: "rounded-xl font-bold px-4 py-2",
          cancelButton: "rounded-xl font-medium px-4 py-2",
        },
      }).then((result) => {
        if (result.isConfirmed) {
          router.push("/subscription");
        }
      });
    }
  };

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
        <Link
          href="/system/dashboard"
          onClick={handleDashboardClick}
          title={isPremium ? "Dashboard" : "Dashboard (สำหรับสมาชิก Premium)"}
          className={`flex h-10 items-center gap-2 rounded-2xl px-2.5 sm:px-3 text-xs font-semibold transition-all duration-200 active:scale-95 ${
            pathname.startsWith("/system/dashboard")
              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30 border border-transparent"
              : "text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 border-blue-200/50 border"
          }`}
        >
          <BarChart3 className="h-[18px] w-[18px]" />
          <span className="hidden md:inline-block">Dashboard</span>
          {!isPremium && (
            <Lock className="h-3 w-3 text-amber-500 hidden sm:inline-block" />
          )}
        </Link>

        {/* เมนู Board (สมาชิกทั่วไปใช้งานได้ตาม Requirement) */}
        <Link
          href="/board"
          title="Board กระดานสนทนา"
          className={`flex h-10 items-center gap-2 rounded-2xl px-2.5 sm:px-3 text-xs font-semibold transition-all duration-200 active:scale-95 ${
            pathname.startsWith("/board")
              ? "bg-rose-600 text-white shadow-sm shadow-rose-500/30 border border-transparent"
              : "text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border-rose-200/50 border"
          }`}
        >
          <MessagesSquare className="h-[18px] w-[18px]" />
          <span className="hidden md:inline-block">Board</span>
        </Link>

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
          {!isPremium && (
            <Lock className="h-3 w-3 text-amber-500 hidden sm:inline-block" />
          )}
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
