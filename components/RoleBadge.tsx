"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Crown,
  User,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Calendar,
  ShieldCheck,
  ChevronRight,
  X,
} from "lucide-react";
import { SubscriptionInfo, ROLE_PERMISSIONS } from "@/lib/subscription-types";

interface RoleBadgeProps {
  subscription: SubscriptionInfo;
}

export function RoleBadge({ subscription }: RoleBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { isPremium, isExpired, daysLeft, plan, subscribedAt, expiresAt } =
    subscription;

  // ปิด panel เมื่อคลิกนอกกล่อง
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // เลือกลักษณะของ Badge
  let badgeClasses = "";
  let iconNode = null;
  let labelText = "";
  let permKey: "premium" | "member" | "expired" = "member";

  if (isPremium) {
    permKey = "premium";
    badgeClasses = isOpen
      ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md shadow-amber-500/40 border border-amber-400/60 scale-95"
      : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-xs shadow-amber-500/30 border border-amber-400/40";
    iconNode = <Crown className="w-3.5 h-3.5 fill-amber-100/40" />;
    labelText = "Premium";
  } else if (isExpired) {
    permKey = "expired";
    badgeClasses = isOpen
      ? "bg-rose-100 text-rose-700 border border-rose-300 scale-95"
      : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200";
    iconNode = <Clock className="w-3.5 h-3.5 text-rose-500" />;
    labelText = "หมดอายุ";
  } else {
    permKey = "member";
    badgeClasses = isOpen
      ? "bg-slate-200 text-slate-800 border border-slate-300 scale-95"
      : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80";
    iconNode = <User className="w-3.5 h-3.5 text-slate-500" />;
    labelText = "Member";
  }

  const permissions = ROLE_PERMISSIONS[permKey];

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Badge — click to toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-transform duration-150 active:scale-95 cursor-pointer select-none ${badgeClasses}`}
        aria-expanded={isOpen}
        aria-label="ดูรายละเอียดสิทธิ์สมาชิก"
      >
        {iconNode}
        <span>{labelText}</span>
        {isPremium && daysLeft !== null && daysLeft <= 7 && (
          <span className="ml-0.5 rounded-full bg-white/25 px-1.5 text-[10px] font-semibold text-white">
            {daysLeft}d
          </span>
        )}
        <ChevronRight
          className={`w-3 h-3 ml-0.5 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
        />
      </button>

      {/* Detail Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 shadow-lg border border-slate-200/80 dark:border-slate-800 z-50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header strip */}
          <div
            className={`px-4 py-3 flex items-center justify-between ${
              isPremium
                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                : isExpired
                ? "bg-rose-500"
                : "bg-slate-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                {isPremium ? (
                  <Crown className="w-4 h-4 text-white fill-white/30" />
                ) : isExpired ? (
                  <Clock className="w-4 h-4 text-white" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <p className="text-xs font-black text-white leading-none">
                  {permissions.title}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          <div className="p-4 space-y-3.5">
            {/* วันที่สมัครและวันหมดอายุ */}
            {(subscribedAt || expiresAt) && (
              <div className="grid grid-cols-2 gap-2">
                {subscribedAt && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-2.5 text-center">
                    <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mb-0.5">
                      <Calendar className="w-3 h-3" /> สมัครเมื่อ
                    </p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {new Date(subscribedAt).toLocaleDateString("th-TH", {
                        year: "2-digit",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {expiresAt && (
                  <div
                    className={`rounded-xl border p-2.5 text-center ${
                      isExpired
                        ? "bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900"
                        : "bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900"
                    }`}
                  >
                    <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mb-0.5">
                      <Clock className="w-3 h-3" /> หมดอายุ
                    </p>
                    <p
                      className={`text-xs font-semibold ${
                        isExpired ? "text-rose-600" : "text-amber-600"
                      }`}
                    >
                      {new Date(expiresAt).toLocaleDateString("th-TH", {
                        year: "2-digit",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* สิทธิ์ที่ทำได้ */}
            <div>
              <div className="text-[10px] font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                สิ่งที่คุณทำได้
              </div>
              <ul className="space-y-1">
                {permissions.can.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ฟีเจอร์ที่ถูกล็อค */}
            {permissions.cannot.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-black tracking-widest uppercase text-rose-500 dark:text-rose-400 mb-2 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  ต้องใช้ Premium
                </div>
                <ul className="space-y-1">
                  {permissions.cannot.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-400 line-through decoration-rose-300/60">
                      <span className="text-rose-400 mt-0.5 shrink-0 no-underline">✗</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA */}
            {!isPremium ? (
              <div className="pt-1">
                <Link
                  href="/subscription"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 px-4 text-xs font-bold text-white shadow-sm shadow-amber-500/30 hover:opacity-95 transition-all active:scale-95"
                >
                  <span>อัปเกรด Premium</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                </Link>
              </div>
            ) : (
              <div className="pt-1 space-y-2">
                <div className="flex items-center justify-between text-xs px-0.5">
                  <span className="text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    สถานะพร้อมใช้งาน
                  </span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {daysLeft !== null ? `เหลือ ${daysLeft} วัน` : "Active"}
                  </span>
                </div>
                <Link
                  href="/subscription"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 py-2 px-3 text-xs font-bold transition-colors"
                >
                  <span>ต่ออายุ </span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
