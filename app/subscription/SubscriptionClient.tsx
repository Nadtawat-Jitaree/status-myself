"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  CheckCircle2,
  XCircle,
  Zap,
  Lock,
  Clock,
  ShieldCheck,
  CreditCard,
  QrCode,
  HelpCircle,
  Flame,
  ChevronDown,
} from "lucide-react";
import Swal from "sweetalert2";
import type { SubscriptionInfo } from "@/lib/subscription-types";

interface SubscriptionClientProps {
  subscription: SubscriptionInfo | null;
  isLockedTriggered: boolean;
}

// รายการ feature เหมือนกันทั้งสองแพ็กเกจ — ต่างแค่จำนวนวัน
const PREMIUM_FEATURES = [
  "ปลดล็อคทุกฟีเจอร์ในระบบ",
  "โน้ตทั่วไป",
  "โน้ตมหาวิทยาลัย",
  "โปรเจกต์จัดการไทม์ไลน์งาน",
  "ระบบปฏิทิน & จัดตารางงาน",
  "ระบบบันทึกทักษะ & แต้มประสบการณ์",
  "Dashboard สรุปภาพรวม & สถิติ",
  "Role Premium แสดงบน Navbar",
];

const FREE_CAN = [
  "คอมเมนต์และสนทนาในบอร์ด",
  "กด Reaction ถูกใจ / ไม่ถูกใจ",
  "แก้ไขโปรไฟล์และอวาตาร์",
];

const FREE_CANNOT = [
  "โน้ตทั่วไป",
  "โน้ตมหาวิทยาลัย",
  "โปรเจกต์จัดการไทม์ไลน์งาน",
  "ระบบปฏิทิน & จัดตารางงาน",
  "ระบบบันทึกทักษะ & แต้มประสบการณ์",
  "Dashboard สรุปภาพรวม & สถิติ",
];

const FAQ = [
  {
    q: "ซื้อซ้ำในขณะที่ยังมีวันเหลืออยู่ จะทบให้หรือไม่?",
    a: "ระบบจะนำวันใหม่ (+30 หรือ +365 วัน) ไปบวกสะสมต่อจากวันหมดอายุเดิมให้อัตโนมัติ สามารถซื้อสะสมล่วงหน้าได้ตลอด",
  },
  {
    q: "เมื่อหมดอายุ ข้อมูลโน้ตของฉันจะหายไปหรือไม่?",
    a: "ไม่หาย ระบบล็อค Workspace ไว้ชั่วคราว เมื่อต่ออายุ ข้อมูลทั้งหมดจะกลับมาทันที",
  },
  {
    q: "สมาชิกทั่วไปสามารถทำอะไรได้บ้าง?",
    a: "อ่าน คอมเมนต์ ส่ง Reaction ในบอร์ดชุมชน และแก้ไขโปรไฟล์ได้ แต่ไม่สามารถใช้ Workspace ได้",
  },
  {
    q: "สแกนจ่ายผ่านแอปธนาคารไทยได้ไหม?",
    a: "ได้เลย รองรับ PromptPay QR Code ผ่านทุกธนาคารในไทย ระบบจะ activate Premium ให้ทันทีหลังชำระ",
  },
];

export function SubscriptionClient({
  subscription,
  isLockedTriggered,
}: SubscriptionClientProps) {
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "yearly" | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const router = useRouter();

  const isPremium = subscription?.isPremium ?? false;
  const isExpired = subscription?.isExpired ?? false;

  const handleCheckout = async (plan: "monthly" | "yearly") => {
    if (!subscription) {
      Swal.fire({
        icon: "info",
        title: "กรุณาเข้าสู่ระบบก่อน",
        text: "คุณต้องเข้าสู่ระบบก่อนเลือกแพ็กเกจ",
        confirmButtonText: "เข้าสู่ระบบ",
        confirmButtonColor: "#f59e0b",
        showCancelButton: true,
        cancelButtonText: "ยกเลิก",
      }).then((res) => {
        if (res.isConfirmed) router.push("/auth/login?redirect=/subscription");
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
      if (!res.ok || data.error) throw new Error(data.error || "ไม่สามารถเชื่อมต่อระบบชำระเงินได้");
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถเริ่มการชำระเงินได้ กรุณาลองใหม่",
        confirmButtonColor: "#f59e0b",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-10 pb-4">

      {/* Lock alert */}
      {isLockedTriggered && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-4 flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">ฟีเจอร์นี้สงวนสิทธิ์สำหรับ Premium</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-0.5">
              เมนูที่คุณพยายามเข้าถึงถูกล็อคไว้สำหรับสมาชิกทั่วไป สมัครหรือต่ออายุ Premium เพื่อเริ่มใช้งานได้ทันที
            </p>
          </div>
        </div>
      )}

      {/* Current status bar */}
      {subscription && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
              isPremium
                ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-white"
                : isExpired
                ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800"
            }`}>
              {isPremium ? <Crown className="w-5 h-5 fill-white/20" /> : isExpired ? <Clock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isPremium
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    : isExpired
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}>
                  {isPremium ? `Premium` : isExpired ? "หมดอายุ" : "Member"}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1">
                {isPremium
                  ? subscription.expiresAt
                    ? <>ใช้งานได้ถึง {new Date(subscription.expiresAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}{subscription.daysLeft !== null && <span className="text-amber-500 ml-1 font-semibold">(เหลือ {subscription.daysLeft} วัน)</span>}</>
                    : "สถานะพรีเมี่ยมเปิดอยู่"
                  : isExpired
                  ? "แพ็กเกจหมดอายุแล้ว — เลือกแพ็กเกจเพื่อเปิดใช้งานต่อ"
                  : "คุณมีสิทธิ์คอมเมนต์ในบอร์ดและแก้ไขโปรไฟล์ของตนเอง"}
              </p>
            </div>
          </div>
          {isPremium && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-4 h-4" /> ปลดล็อคทุกฟีเจอร์แล้ว
            </div>
          )}
        </div>
      )}

      {/* Headline */}
      <div className="text-center space-y-2.5">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          ปลดล็อคทุกศักยภาพ
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          จดบันทึก จัดการตารางชีวิต และวางแผนโปรเจกต์ได้อย่างอิสระ
        </p>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch max-w-5xl mx-auto">

        {/* Free */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-5 shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">สิทธิ์เริ่มต้น</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">ฟรีตลอดไป</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Member</h3>
            <p className="text-xs text-slate-400 mt-1">สำหรับผู้สมัครใหม่ที่ต้องการอ่านและแลกเปลี่ยนในชุมชน</p>
            <div className="mt-4 mb-5">
              <span className="text-3xl font-black text-slate-900 dark:text-white">฿0</span>
              <span className="text-xs text-slate-400 ml-1">/ ตลอดชีพ</span>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">ใช้งานได้:</p>
              {FREE_CAN.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1.5">ถูกล็อค:</p>
                {FREE_CANNOT.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-400 line-through decoration-rose-200">
                    <XCircle className="w-3.5 h-3.5 text-rose-300 shrink-0 mt-0.5 no-underline" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button disabled className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-xs cursor-default">
            แพ็กเกจปัจจุบัน
          </button>
        </div>

        {/* Monthly */}
        <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 bg-white dark:bg-slate-900 p-5 flex flex-col gap-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Crown className="w-3 h-3" /> Premium
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">30 วัน</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">รายเดือน</h3>
            <p className="text-xs text-slate-400 mt-1">เข้าถึงทุกฟีเจอร์ จ่ายสบาย เดือนละ 50 บาท</p>
            <div className="mt-4 mb-5">
              <span className="text-3xl font-black text-slate-900 dark:text-white">฿50</span>
              <span className="text-xs text-slate-400 ml-1">/ เดือน</span>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1.5">สิ่งที่คุณจะได้รับ:</p>
              {PREMIUM_FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => handleCheckout("monthly")}
            disabled={loadingPlan !== null}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-transform duration-150 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loadingPlan === "monthly" ? (
              <span>กำลังเปิดหน้าชำระเงิน...</span>
            ) : isPremium ? (
              <><Zap className="w-4 h-4" /> ต่ออายุ +30 วัน</>
            ) : (
              <><Zap className="w-4 h-4" /> สมัครรายเดือน</>
            )}
          </button>
        </div>

        {/* Yearly */}
        <div className="relative rounded-2xl border-2 border-orange-400 dark:border-orange-500 bg-gradient-to-b from-orange-50/60 to-amber-50/30 dark:from-slate-900 dark:to-orange-950/20 p-5 flex flex-col gap-5">
          <div className="absolute -top-3 right-5 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black flex items-center gap-1">
            <Flame className="w-3 h-3 fill-white" /> คุ้มค่าที่สุด · ประหยัด 17%
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <Crown className="w-3 h-3" /> Premium รายปี
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">365 วัน</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">รายปี (12 เดือน)</h3>
            <p className="text-xs text-slate-400 mt-1">จ่าย 500 บาท ใช้งาน 365 วัน เฉลี่ยเดือนละ ≈ 41.6 บาท</p>
            <div className="mt-4 mb-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white">฿500</span>
              <span className="text-xs text-slate-400 ml-1">/ ปี</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mb-4">✓ ประหยัด 100 บาท เทียบกับรายเดือน</p>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-1.5">สิ่งที่คุณจะได้รับ:</p>
              {PREMIUM_FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => handleCheckout("yearly")}
            disabled={loadingPlan !== null}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:opacity-95 text-white font-bold text-xs transition-transform duration-150 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loadingPlan === "yearly" ? (
              <span>กำลังเปิดหน้าชำระเงิน...</span>
            ) : isPremium ? (
              <><Crown className="w-4 h-4" /> ต่ออายุ +365 วัน</>
            ) : (
              <><Crown className="w-4 h-4" /> สมัครรายปี · สุดคุ้ม</>
            )}
          </button>
        </div>
      </div>

      {/* Payment methods */}
      <div className="max-w-2xl mx-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 px-6 py-4 text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">ช่องทางชำระเงิน</p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-semibold">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
            <QrCode className="w-3.5 h-3.5 text-blue-600" />
            PromptPay QR
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            Visa / Mastercard
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            256-bit SSL
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto space-y-2">
        <div className="flex items-center gap-2 justify-center mb-4">
          <HelpCircle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">คำถามที่พบบ่อย</h3>
        </div>
        {FAQ.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              className="w-full flex items-center justify-between gap-3 p-4 text-left"
            >
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.q}</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${openFaq === idx ? "rotate-180" : ""}`}
              />
            </button>
            {openFaq === idx && (
              <div className="px-4 pb-4 text-xs text-slate-500 dark:text-slate-400">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
