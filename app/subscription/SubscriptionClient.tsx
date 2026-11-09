"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  CheckCircle2,
  XCircle,
  Zap,
  Sparkles,
  Lock,
  Clock,
  ShieldCheck,
  CreditCard,
  QrCode,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Flame,
} from "lucide-react";
import Swal from "sweetalert2";
import type { SubscriptionInfo } from "@/lib/subscription-types";

interface SubscriptionClientProps {
  subscription: SubscriptionInfo | null;
  isLockedTriggered: boolean;
}

export function SubscriptionClient({
  subscription,
  isLockedTriggered,
}: SubscriptionClientProps) {
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "yearly" | null>(
    null
  );
  const router = useRouter();

  const isPremium = subscription?.isPremium ?? false;
  const isExpired = subscription?.isExpired ?? false;

  const handleCheckout = async (plan: "monthly" | "yearly") => {
    if (!subscription) {
      Swal.fire({
        icon: "info",
        title: "กรุณาเข้าสู่ระบบก่อน",
        text: "คุณต้องเข้าสู่ระบบบัญชีของคุณก่อนเลือกแพ็กเกจ",
        confirmButtonText: "เข้าสู่ระบบ",
        confirmButtonColor: "#3b82f6",
        showCancelButton: true,
        cancelButtonText: "ยกเลิก",
      }).then((res) => {
        if (res.isConfirmed) {
          router.push("/auth/login?redirect=/subscription");
        }
      });
      return;
    }

    try {
      setLoadingPlan(plan);

      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "ไม่สามารถเชื่อมต่อระบบชำระเงินได้");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถเริ่มการชำระเงินได้ กรุณาลองใหม่อีกครั้ง",
        confirmButtonColor: "#f59e0b",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-12">
      {/* แจ้งเตือนเมื่อถูกล็อคจาก Workspace */}
      {isLockedTriggered && (
        <div className="rounded-3xl bg-amber-500/10 border-2 border-amber-400/60 p-4 sm:p-5 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200">
              ฟีเจอร์นี้สงวนสิทธิ์สำหรับสมาชิก Premium
            </h3>
            <p className="text-xs sm:text-sm text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              เมนูหรือหน้าที่คุณพยายามเข้าถึง (โน้ต, โปรเจกต์, ปฏิทิน, ทักษะ,
              แดชบอร์ด) ถูกล็อคไว้สำหรับสมาชิกทั่วไป กรุณาสมัครหรือต่ออายุแพ็กเกจ
              Premium เพื่อเริ่มใช้งานได้ทันที
            </p>
          </div>
        </div>
      )}

      {/* แถบสถานะปัจจุบันของผู้ใช้ */}
      {subscription && (
        <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                isPremium
                  ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30"
                  : isExpired
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800"
              }`}
            >
              {isPremium ? (
                <Crown className="w-6 h-6 fill-white/20" />
              ) : isExpired ? (
                <Clock className="w-6 h-6" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">
                  สถานะปัจจุบัน:
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    isPremium
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : isExpired
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {isPremium
                    ? `Premium (${subscription.plan === "yearly" ? "รายปี" : "รายเดือน"})`
                    : isExpired
                    ? "หมดอายุแล้ว"
                    : "สมาชิกทั่วไป (Member)"}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {isPremium ? (
                  subscription.expiresAt ? (
                    <>
                      ใช้งานได้ถึง{" "}
                      {new Date(subscription.expiresAt).toLocaleDateString(
                        "th-TH",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}{" "}
                      {subscription.daysLeft !== null && (
                        <span className="text-xs text-amber-600 font-semibold">
                          (เหลืออีก {subscription.daysLeft} วัน)
                        </span>
                      )}
                    </>
                  ) : (
                    "สถานะพรีเมี่ยมเปิดใช้งานอยู่"
                  )
                ) : isExpired ? (
                  "แพ็กเกจเดิมของคุณหมดอายุแล้ว กรุณาเลือกแพ็กเกจเพื่อเปิดใช้งานต่อ"
                ) : (
                  "คุณมีสิทธิ์คอมเมนต์ในบอร์ดและแก้ไขโปรไฟล์ของตนเอง"
                )}
              </p>
            </div>
          </div>

          {isPremium && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 self-end sm:self-center">
              <CheckCircle2 className="w-4 h-4" />
              <span>ปลดล็อคทุกฟีเจอร์แล้ว</span>
            </div>
          )}
        </div>
      )}

      {/* ส่วนหัว Headline */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-300/40">
          <Sparkles className="w-3.5 h-3.5" />
          <span>NJ Notes Premium Subscription</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          ปลดล็อคทุกศักยภาพการเรียนและทำงาน
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          เลือกแพ็กเกจที่เหมาะกับคุณ จดบันทึก จัดการตารางชีวิต และวางแผนโปรเจกต์ได้อย่างอิสระ ไม่มีโฆษณากวนใจ
        </p>
      </div>

      {/* Grid Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-6xl mx-auto">
        {/* 1. สมาชิกทั่วไป (Free) */}
        <div className="relative rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-7 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                สิทธิ์เริ่มต้น
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                ฟรีตลอดไป
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
              สมาชิกทั่วไป
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              สำหรับผู้สมัครใหม่ที่ต้องการเข้ามาอ่านและแลกเปลี่ยนความรู้ในชุมชน
            </p>

            <div className="my-6">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                  ฿0
                </span>
                <span className="text-xs text-slate-400">/ ตลอดชีพ</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                ฟีเจอร์ที่ใช้งานได้:
              </div>
              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>คอมเมนต์และสนทนาในบอร์ดคนอื่น</span>
              </div>
              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>กด Reaction ถูกใจ/ไม่ถูกใจ ในบอร์ด</span>
              </div>
              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>แก้ไขข้อมูลโปรไฟล์และอวาตาร์ของตนเอง</span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-[11px] font-bold uppercase text-rose-500 tracking-wider">
                  ฟีเจอร์ที่ถูกล็อค (ต้องใช้ Premium):
                </div>
                <div className="flex items-start gap-2 text-slate-400 line-through">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>ระบบโน้ตทั่วไป & โน้ตมหาวิทยาลัย</span>
                </div>
                <div className="flex items-start gap-2 text-slate-400 line-through">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>ระบบจัดการโปรเจกต์ & Kanban Tasks</span>
                </div>
                <div className="flex items-start gap-2 text-slate-400 line-through">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>ปฏิทิน & Daily Logs</span>
                </div>
                <div className="flex items-start gap-2 text-slate-400 line-through">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>ระบบสะสมทักษะ (Qualities)</span>
                </div>
                <div className="flex items-start gap-2 text-slate-400 line-through">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>แดชบอร์ดและสถิติภาพรวม</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7">
            <button
              disabled
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-xs cursor-default"
            >
              แพ็กเกจปัจจุบันของคุณ
            </button>
          </div>
        </div>

        {/* 2. Premium รายเดือน (50 THB) */}
        <div className="relative rounded-3xl border-2 border-amber-300 dark:border-amber-700/60 bg-gradient-to-b from-white to-amber-50/30 dark:from-slate-900 dark:to-slate-900/90 p-6 sm:p-7 flex flex-col justify-between shadow-lg shadow-amber-500/5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> พรีเมี่ยม
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                30 วัน
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
              รายเดือน
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              เข้าถึงทุกฟีเจอร์อย่างเต็มรูปแบบ สะดวก จ่ายสบายเพียงเดือนละ 50 บาท
            </p>

            <div className="my-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
                  ฿50
                </span>
                <span className="text-xs text-slate-500">/ เดือน</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                สิ่งที่คุณจะได้รับ:
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><b>ปลดล็อคทุกฟีเจอร์ที่ระบบมี</b> ครบถ้วน</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>โน้ตทั่วไป & โน้ตมหาวิทยาลัย ไม่จำกัด</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>จัดการโปรเจกต์ & Kanban board ต่องาน</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>ปฏิทิน & บันทึกตารางงาน Daily Logs</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>บันทึกทักษะ & ระบบเลเวล (Qualities)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Dashboard สรุปภาพรวมและวิเคราะห์ผล</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Role Premium เด่นชัดพร้อมตราสัญลักษณ์บน Navbar</span>
              </div>
            </div>
          </div>

          <div className="mt-7">
            <button
              onClick={() => handleCheckout("monthly")}
              disabled={loadingPlan !== null}
              className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/25 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loadingPlan === "monthly" ? (
                <span>กำลังเปิดระบบชำระเงิน...</span>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>สมัครแพ็กเกจรายเดือน (50 บาท)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3. Premium รายปี (500 THB) - แนะนำสุดคุ้ม */}
        <div className="relative rounded-3xl border-2 border-orange-400 dark:border-orange-500 bg-gradient-to-b from-orange-50/50 via-white to-amber-50/40 dark:from-slate-900 dark:to-orange-950/20 p-6 sm:p-7 flex flex-col justify-between shadow-xl shadow-orange-500/10">
          {/* Badge แนะนำ */}
          <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-black shadow-md shadow-orange-500/30 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 fill-white" />
            <span>คุ้มค่าที่สุด • ประหยัด 17%</span>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> พรีเมี่ยมรายปี
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300">
                365 วัน
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
              รายปี (12 เดือน)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              จ่ายเพียง 500 บาท ใช้งานได้ยาวนานตลอด 1 ปีเต็ม (เฉลี่ยเพียงเดือนละ 41.6 บาท)
            </p>

            <div className="my-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
                  ฿500
                </span>
                <span className="text-xs text-slate-500">/ ปี</span>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                ✓ ประหยัดทันที 100 บาท เมื่อเทียบกับรายเดือน
              </p>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="text-[11px] font-bold uppercase text-orange-600 dark:text-orange-400 tracking-wider">
                สิทธิประโยชน์แบบจัดเต็ม:
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><b>ปลดล็อคทุกฟีเจอร์ที่ระบบมี</b> ตลอด 365 วัน</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>พื้นที่เก็บข้อมูลโน้ตและรูปภาพไม่จำกัด</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>ระบบโปรเจกต์ ตารางงาน ปฏิทิน และทักษะแบบเต็มรูปแบบ</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>ตราสัญลักษณ์ Premium พิเศษติดทนนาน 1 ปี</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>ได้รับการอัปเดตฟีเจอร์ใหม่ๆ ก่อนใครเสมอ</span>
              </div>
            </div>
          </div>

          <div className="mt-7">
            <button
              onClick={() => handleCheckout("yearly")}
              disabled={loadingPlan !== null}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loadingPlan === "yearly" ? (
                <span>กำลังเปิดระบบชำระเงิน...</span>
              ) : (
                <>
                  <Crown className="w-4 h-4" />
                  <span>สมัครแพ็กเกจรายปี (500 บาท) — สุดคุ้ม</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ช่องทางชำระเงินที่รองรับ */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-6 max-w-4xl mx-auto text-center space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          ช่องทางการชำระเงินที่ปลอดภัยโดย Stripe
        </h4>
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 dark:text-slate-300 font-semibold">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-xl">
            <QrCode className="w-4 h-4 text-blue-600" />
            <span>สแกน QR PromptPay (พร้อมเพย์)</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-xl">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>บัตรเครดิต / เดบิต (Visa, Mastercard)</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>ความปลอดภัยระดับ 256-bit SSL</span>
          </div>
        </div>
      </div>

      {/* คำถามที่พบบ่อย (FAQ) */}
      <div className="max-w-3xl mx-auto space-y-6 pt-6">
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-500" />
            <span>คำถามที่พบบ่อย (FAQ)</span>
          </h3>
        </div>

        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              เมื่อหมดอายุแพ็กเกจ ข้อมูลโน้ตของฉันจะหายไปหรือไม่?
            </h5>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              ข้อมูลของคุณจะไม่สูญหาย ระบบจะยังคงเก็บโน้ตและโปรเจกต์ของคุณไว้อย่างปลอดภัย แต่จะทำการล็อคการเข้าใช้งานไว้ชั่วคราว จนกว่าคุณจะต่ออายุแพ็กเกจใหม่
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              สมาชิกทั่วไปสามารถทำอะไรได้บ้าง?
            </h5>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              สมาชิกทั่วไปสามารถเข้ามาใช้งานหน้า Board ชุมชน อ่านและคอมเมนต์โน้ตของผู้อื่น ส่ง Reaction และแก้ไขโปรไฟล์ของตนเองได้ แต่จะไม่สามารถใช้งานฟีเจอร์ Workspace (โน้ตทั่วไป, โน้ตมหาวิทยาลัย, โปรเจกต์, ปฏิทิน, ทักษะ และ Dashboard) ได้
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              สามารถสแกนจ่ายผ่านแอปธนาคารไทยได้หรือไม่?
            </h5>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              ได้แน่นอน ระบบ Stripe รองรับการชำระผ่าน PromptPay QR Code สามารถเปิดแอปธนาคารใดก็ได้ในประเทศไทยเพื่อสแกนชำระ และระบบจะเปิดใช้งานสิทธิ์ Premium ให้อัตโนมัติทันที
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
