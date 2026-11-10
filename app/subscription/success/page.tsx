import { Suspense } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Crown,
  Sparkles,
  BarChart3,
  LayoutGrid,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { stripe } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/stripe-fulfillment";
import { CleanSessionUrl } from "./CleanSessionUrl";

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
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
      if (session) await fulfillCheckoutSession(session);
    } catch (err) {
      console.warn("Auto-fulfillment on success page error:", err);
    }
  }

  return null;
}

const UNLOCKED = [
  "Workspace โน้ตทั่วไป & โน้ตมหาวิทยาลัย",
  "สร้างโปรเจกต์ & ติดตามงาน",
  "ปฏิทิน & Daily Logs",
  "สะสมทักษะ & ดูสถิติใน Dashboard",
];

export default function SubscriptionSuccessPage({ searchParams }: SuccessPageProps) {
  return (
    <main className="min-h-screen flex flex-col items-center w-full bg-slate-50/50 dark:bg-slate-950">
      <CleanSessionUrl />
      <Suspense fallback={null}>
        <SuccessFulfillment searchParams={searchParams} />
      </Suspense>

      {/* Navbar */}
      <Navbar />

      {/* Content */}
      <div className="w-full flex-1 flex items-center justify-center p-4 py-16">
        <div className="max-w-sm w-full space-y-5 text-center">

          {/* Icon */}
          <div className="relative mx-auto w-fit">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white shadow-md">
              <Crown className="w-10 h-10 fill-white/20" />
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Text */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> ชำระเงินสำเร็จ
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              ยินดีต้อนรับสู่ Premium!
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              บัญชีของคุณได้รับการอัปเกรดเป็น <strong>Premium</strong> แล้ว ฟีเจอร์ทั้งหมดพร้อมใช้งานทันที
            </p>
          </div>

          {/* Unlocked features */}
          <div className="rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 p-4 text-left">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-3">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              สิทธิ์ที่คุณปลดล็อคแล้ว:
            </p>
            <ul className="space-y-1.5">
              {UNLOCKED.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-amber-900/80 dark:text-amber-200/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-2.5">
            <Link
              href="/system/dashboard"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white font-bold text-xs shadow-sm transition-transform duration-150 active:scale-95"
            >
              <BarChart3 className="w-4 h-4" />
              ไปยัง Dashboard
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Link>
            <Link
              href="/system/notes/normal"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              เริ่มจดโน้ตแรก
            </Link>
          </div>
        </div>
      </div>

      <Footer variant="system" />
    </main>
  );
}
