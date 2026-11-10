"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, SquareKanban, Lock, Crown, ChevronRight } from "lucide-react";
import Swal from "sweetalert2";
import { getUserSubscriptionAction } from "@/app/actions/subscription";
import type { SubscriptionInfo } from "@/lib/subscription-types";

interface NoteTypeModalProps {
  open: boolean;
  onClose: () => void;
  subscription?: SubscriptionInfo | null;
}

export default function NoteTypeModal({
  open,
  onClose,
  subscription: propSub,
}: NoteTypeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [fetchedSub, setFetchedSub] = useState<SubscriptionInfo | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // ดึงข้อมูลสิทธิ์ล่าสุดเมื่อเปิด Modal (กรณีไม่ได้ส่ง propSub เข้ามา)
  useEffect(() => {
    if (open && !propSub) {
      getUserSubscriptionAction()
        .then((res) => setFetchedSub(res))
        .catch(() => setFetchedSub(null));
    }
  }, [open, propSub]);

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

  const currentSub = propSub || fetchedSub;
  const isPremium = currentSub?.isPremium ?? false;

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

  const handleItemClick = async (
    e: React.MouseEvent<HTMLAnchorElement>,
    title: string
  ) => {
    let checkPremium = isPremium;
    if (!checkPremium) {
      // ตรวจสอบสดๆ อีก 1 ครั้งก่อนตัดสินใจบล็อค ป้องกันข้อมูลค้างเก่า
      const fresh = await getUserSubscriptionAction().catch(() => null);
      if (fresh?.isPremium) {
        setFetchedSub(fresh);
        onClose();
        return;
      }
    }

    if (!checkPremium) {
      e.preventDefault();
      Swal.fire({
        icon: "warning",
        title: "ฟีเจอร์สำหรับสมาชิก Premium",
        html: `<div class="text-sm text-slate-600 space-y-2">
          <p>เมนู <b>${title}</b> สงวนสิทธิ์สำหรับสมาชิก <b>Premium</b> เท่านั้น</p>
          <p class="text-xs text-slate-500">สมัครสมาชิกเพื่อปลดล็อคทุกฟีเจอร์ เริ่มต้นเพียง 50 บาท/เดือน หรือ 500 บาท/ปี</p>
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
          onClose();
          router.push("/subscription");
        }
      });
    } else {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-modal-title"
    >
      <div
        className="relative w-full max-w-3xl rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ปุ่มปิดมุมขวาบน */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          aria-label="ปิดหน้าต่าง"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ส่วนหัว Modal */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold mb-2">
            <SquareKanban className="w-3.5 h-3.5" />
            <span>Workspace</span>
          </div>
          <h2
            id="workspace-modal-title"
            className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            เลือกพื้นที่ทำงาน
          </h2>
          {!isPremium && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center justify-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              <span>สมาชิกทั่วไปยังไม่สามารถเข้าใช้งานเมนู Workspace เหล่านี้ได้</span>
            </p>
          )}
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 sm:gap-4">
          {workspaceItems.map((item, index) => {
            const isLastOdd =
              index === workspaceItems.length - 1 &&
              workspaceItems.length % 2 !== 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleItemClick(e, item.title)}
                className={`group relative flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 transition-all duration-200 hover:shadow-sm active:scale-95 text-center ${
                  item.hoverBorder
                } ${item.hoverBg} ${
                  isLastOdd
                    ? "col-span-2 sm:col-span-1 max-w-[200px] sm:max-w-none mx-auto w-full"
                    : ""
                } ${!isPremium ? "opacity-75 hover:opacity-100" : ""}`}
              >
                {/* แสงเรืองบางๆ ด้านหลังโลโก้ */}
                <div
                  className={`absolute inset-0 rounded-2xl sm:rounded-3xl bg-radial ${item.glowBg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                />

                {/* แม่กุญแจสำหรับผู้ใช้ที่ไม่ใช่ Premium */}
                {!isPremium && (
                  <div className="absolute top-2.5 right-2.5 flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 border border-amber-300/40 shadow-xs z-10">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* โลโก้เด่นชัด */}
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

                {/* ชื่อพื้นที่ทำงาน */}
                <span
                  className={`mt-3 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors ${item.textColor}`}
                >
                  {item.title}
                </span>

                {!isPremium && (
                  <span className="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                    Premium
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* แถบแจ้งเตือนชวนอัปเกรด สำหรับสมาชิกทั่วไป */}
        {!isPremium && (
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <Crown className="w-5 h-5 fill-white/20" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">
                  ปลดล็อคทุกพื้นที่ทำงานด้วย Premium
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  รายเดือน 50 บาท / รายปี 500 บาท ใช้งานได้ครบทุกฟีเจอร์
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                router.push("/subscription");
              }}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              <span>อัปเกรดเลย</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ปุ่มปิดด้านล่าง */}
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="rounded-md px-6 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
