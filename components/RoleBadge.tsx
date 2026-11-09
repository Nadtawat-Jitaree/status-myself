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
  Zap,
} from "lucide-react";
import { SubscriptionInfo, ROLE_PERMISSIONS } from "@/lib/subscription-types";

interface RoleBadgeProps {
  subscription: SubscriptionInfo;
}

export function RoleBadge({ subscription }: RoleBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { isPremium, isExpired, daysLeft, role, plan, subscribedAt, expiresAt } =
    subscription;

  // ปิด popup เมื่อคลิกนอกกล่อง
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // เลือกลักษณะของ Badge
  let badgeClasses = "";
  let iconNode = null;
  let labelText = "";
  let permKey: "premium" | "member" | "expired" = "member";

  if (isPremium) {
    permKey = "premium";
    badgeClasses =
      "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-xs shadow-amber-500/30 hover:shadow-md hover:shadow-amber-500/40 border border-amber-400/40";
    iconNode = <Crown className="w-3.5 h-3.5 fill-amber-100/40 animate-pulse" />;
    labelText = "Premium";
  } else if (isExpired) {
    permKey = "expired";
    badgeClasses =
      "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200";
    iconNode = <Clock className="w-3.5 h-3.5 text-rose-500" />;
    labelText = "หมดอายุ";
  } else {
    permKey = "member";
    badgeClasses =
      "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80";
    iconNode = <User className="w-3.5 h-3.5 text-slate-500" />;
    labelText = "สมาชิกทั่วไป";
  }

  const permissions = ROLE_PERMISSIONS[permKey];

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Badge Link -> กดที่ Role แล้วไปหน้า subscription */}
      <Link
        href="/subscription"
        onClick={() => setIsOpen(false)}
        className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer select-none ${badgeClasses}`}
        aria-label="ไปยังหน้าจัดการแพ็กเกจและดูสิทธิ์"
        title="คลิกเพื่อไปยังหน้าแพ็กเกจ Premium / ชี้เมาส์เพื่อดูรายละเอียดสิทธิ์"
      >
        {iconNode}
        <span>{labelText}</span>
        {isPremium && daysLeft !== null && daysLeft <= 7 && (
          <span className="ml-0.5 rounded-full bg-white/25 px-1.5 py-0.2 text-[10px] font-semibold text-white">
            {daysLeft} วัน
          </span>
        )}
      </Link>

      {/* Popover / Tooltip */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  isPremium
                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600"
                    : isExpired
                    ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                }`}
              >
                {isPremium ? (
                  <Crown className="w-5 h-5 fill-amber-500/20" />
                ) : isExpired ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  {permissions.title}
                  {isPremium && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded-md font-semibold">
                      {plan === "yearly" ? "รายปี (365 วัน)" : "รายเดือน (30 วัน)"}
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {permissions.description}
                </p>
              </div>
            </div>
          </div>

          {/* วันที่สมัครและวันหมดอายุ (ถ้ามี) */}
          {(subscribedAt || expiresAt) && (
            <div className="my-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              {subscribedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> วันที่สมัคร:
                  </span>
                  <span className="font-medium">
                    {new Date(subscribedAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
              {expiresAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> วันหมดอายุ:
                  </span>
                  <span
                    className={`font-semibold ${
                      isExpired ? "text-rose-600" : "text-amber-600"
                    }`}
                  >
                    {new Date(expiresAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {daysLeft !== null && !isExpired && ` (เหลือ ${daysLeft} วัน)`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* รายการสิทธิ์ที่ทำได้ */}
          <div className="mt-3">
            <div className="text-[11px] font-bold tracking-wide uppercase text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>สิ่งที่คุณทำได้:</span>
            </div>
            <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
              {permissions.can.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* รายการฟีเจอร์ที่ทำไม่ได้ / ถูกล็อค */}
          {permissions.cannot.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[11px] font-bold tracking-wide uppercase text-rose-500 dark:text-rose-400 mb-1.5 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>ฟีเจอร์ที่ถูกล็อค (ต้องใช้ Premium):</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {permissions.cannot.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 line-through decoration-rose-300">
                    <span className="text-rose-400 font-bold mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ปุ่ม CTA ไปยังหน้า Subscription */}
          {!isPremium && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/subscription"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 py-2.5 px-4 text-xs font-bold text-white shadow-sm shadow-amber-500/30 hover:opacity-95 transition-transform active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>อัปเกรดเป็น Premium (เริ่มต้น 50.- / เดือน)</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </Link>
            </div>
          )}

          {isPremium && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  สถานะสมาชิกพร้อมใช้งาน
                </span>
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  {daysLeft !== null ? `เหลืออีก ${daysLeft} วัน` : "Premium"}
                </span>
              </div>
              <Link
                href="/subscription"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 py-2 px-3 text-xs font-bold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ต่ออายุเพิ่ม (บวกวันใช้งานสะสม)</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
