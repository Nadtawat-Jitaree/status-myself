import Link from "next/link";
import { ArrowLeft, RefreshCw, ShieldAlert } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function SubscriptionCancelPage() {
  return (
    <main className="min-h-screen flex flex-col items-center w-full bg-slate-50/50 dark:bg-slate-950">
      {/* Navbar */}
      <Navbar />

      {/* Content */}
      <div className="w-full flex-1 flex items-center justify-center p-4 py-16">
        <div className="max-w-sm w-full space-y-5 text-center">

          {/* Icon */}
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800 mx-auto shadow-xs">
            <ShieldAlert className="w-9 h-9 text-amber-500" />
          </div>

          {/* Text */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
              การทำรายการถูกยกเลิก
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              ยังไม่มีการตัดเงิน
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              คุณปิดหน้าต่างหรือยกเลิกขั้นตอนการชำระเงินก่อนทำรายการเสร็จ
              ไม่มีการหักเงินจากบัตรหรือบัญชีของคุณ
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-2.5">
            <Link
              href="/subscription"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-transform duration-150 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              กลับไปเลือกแพ็กเกจ
            </Link>
            <Link
              href="/board"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับหน้าบอร์ดชุมชน
            </Link>
          </div>
        </div>
      </div>

      <Footer variant="system" />
    </main>
  );
}
