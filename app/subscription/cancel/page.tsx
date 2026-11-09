import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, HelpCircle, ShieldAlert } from "lucide-react";
import { NavbarLeft } from "@/components/navbar-left";
import { NavbarRight } from "@/components/navbar-right";
import { Footer } from "@/components/footer";

export default function SubscriptionCancelPage() {
  return (
    <main className="min-h-screen flex flex-col items-center w-full bg-slate-50/50 dark:bg-slate-950">
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

      {/* Main Container */}
      <div className="w-full flex-1 flex items-center justify-center p-4 py-16">
        <div className="max-w-md w-full rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-500 shadow-xs">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              การทำรายการถูกยกเลิก
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              คุณได้ยกเลิกขั้นตอนการชำระเงินใน Stripe หรือปิดหน้าต่างก่อนทำรายการเสร็จ ยังไม่มีการตัดเงินจากบัตรหรือบัญชีของคุณ
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href="/subscription"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/25 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>กลับไปเลือกแพ็กเกจใหม่</span>
            </Link>

            <Link
              href="/board"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับไปยังหน้าบอร์ดชุมชน</span>
            </Link>
          </div>
        </div>
      </div>

      <Footer variant="system" />
    </main>
  );
}
