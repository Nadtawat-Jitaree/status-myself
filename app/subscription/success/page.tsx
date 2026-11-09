import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, Crown, Sparkles, ArrowRight, LayoutGrid, BarChart3 } from "lucide-react";
import { NavbarLeft } from "@/components/navbar-left";
import { NavbarRight } from "@/components/navbar-right";
import { Footer } from "@/components/footer";
import { stripe } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/stripe-fulfillment";
import { CleanSessionUrl } from "./CleanSessionUrl";

interface SuccessPageProps {
  searchParams: Promise<{
    session_id?: string;
  }>;
}

async function SuccessFulfillment({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const sessionId = resolvedSearchParams?.session_id;

  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session) {
        await fulfillCheckoutSession(session);
      }
    } catch (err) {
      console.warn("Auto-fulfillment on success page error:", err);
    }
  }

  return null;
}

export default function SubscriptionSuccessPage({
  searchParams,
}: SuccessPageProps) {
  return (
    <main className="min-h-screen flex flex-col items-center w-full bg-slate-50/50 dark:bg-slate-950">
      <CleanSessionUrl />
      <Suspense fallback={null}>
        <SuccessFulfillment searchParams={searchParams} />
      </Suspense>

      {/* Navbar Header */}
      <nav className="w-full flex justify-center border-b border-b-slate-200/80 dark:border-b-slate-800 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="w-full max-w-7xl flex justify-between items-center p-2 sm:p-3 sm:px-5 text-sm">
          <div className="flex gap-2 sm:gap-5 items-center font-semibold">
            <Suspense fallback={<div className="w-10 h-10 animate-pulse bg-slate-200 rounded-xl" />}>
              <NavbarLeft />
            </Suspense>
          </div>
          <Suspense fallback={<div className="w-20 h-8 animate-pulse bg-slate-200 rounded-md" />}>
            <NavbarRight />
          </Suspense>
        </div>
      </nav>

      {/* Main Success Container */}
      <div className="w-full flex-1 flex items-center justify-center p-4 py-16">
        <div className="max-w-md w-full rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center space-y-6">
          {/* Animated Success Badge */}
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-500 text-white shadow-xl shadow-amber-500/30">
            <Crown className="w-10 h-10 fill-white/20 animate-bounce" />
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white border-2 border-white dark:border-slate-900 shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ชำระเงินเรียบร้อยแล้ว</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              ยินดีต้อนรับสู่ NJ Notes Premium!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              ระบบได้ทำการอัปเกรดสถานะบัญชีของคุณเป็น <b>Premium</b> เรียบร้อยแล้ว ฟีเจอร์ทั้งหมดในระบบได้รับการปลดล็อคให้คุณใช้งานได้อย่างเต็มที่ทันที
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 text-xs text-amber-800 dark:text-amber-200 text-left space-y-1.5">
            <p className="font-bold flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-600" />
              สิทธิพิเศษที่คุณได้รับตอนนี้:
            </p>
            <ul className="list-disc list-inside text-amber-900/80 dark:text-amber-200/80 space-y-0.5 text-[11px]">
              <li>เข้าใช้งาน Workspace โน้ตทั่วไป และโน้ตมหาวิทยาลัย</li>
              <li>สร้างโปรเจกต์และติดตามสถานะงาน</li>
              <li>ใช้งานปฏิทิน และบันทึก Daily Log</li>
              <li>สะสมทักษะและดูสถิติใน Dashboard</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href="/system/dashboard"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-amber-500/30 transition-all active:scale-95"
            >
              <BarChart3 className="w-4 h-4" />
              <span>ไปยัง Dashboard</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Link>

            <Link
              href="/system/notes/normal"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>เริ่มจดโน้ตแรกของคุณ</span>
            </Link>
          </div>
        </div>
      </div>

      <Footer variant="system" />
    </main>
  );
}
