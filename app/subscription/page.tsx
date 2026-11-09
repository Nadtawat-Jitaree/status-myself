import { Suspense } from "react";
import { Metadata } from "next";
import { getSubscriptionInfo } from "@/lib/subscription";
import { NavbarLeft } from "@/components/navbar-left";
import { NavbarRight } from "@/components/navbar-right";
import { Footer } from "@/components/footer";
import { SubscriptionClient } from "./SubscriptionClient";

export const metadata: Metadata = {
  title: "สมัครสมาชิก Premium ปลดล็อคทุกฟีเจอร์ | NJ Notes",
  description:
    "อัปเกรดเป็น NJ Notes Premium เพื่อเข้าถึงระบบโน้ต บอร์ดติดตามงาน ปฏิทิน และบันทึกทักษะอย่างไร้ขีดจำกัด เริ่มต้นเพียง 50 บาท/เดือน",
};

function SubscriptionLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      <p className="text-sm font-semibold text-slate-500 animate-pulse">
        กำลังโหลดข้อมูลแพ็กเกจ...
      </p>
    </div>
  );
}

async function SubscriptionContent({
  searchParams,
}: {
  searchParams: Promise<{ locked?: string }>;
}) {
  const [subscription, resolvedSearchParams] = await Promise.all([
    getSubscriptionInfo(),
    searchParams,
  ]);

  const isLockedTriggered = resolvedSearchParams?.locked === "true";

  return (
    <SubscriptionClient
      subscription={subscription}
      isLockedTriggered={isLockedTriggered}
    />
  );
}

interface SubscriptionPageProps {
  searchParams: Promise<{
    locked?: string;
  }>;
}

export default function SubscriptionPage({ searchParams }: SubscriptionPageProps) {
  return (
    <main className="min-h-screen flex flex-col items-center w-full bg-slate-50/50 dark:bg-slate-950">
      {/* Navbar Header */}
      <nav className="w-full flex justify-center border-b border-b-slate-200/80 dark:border-b-slate-800 h-16 bg-white dark:bg-slate-900 sticky top-0 z-40">
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

      {/* Main Content */}
      <div className="w-full flex-1 max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Suspense fallback={<SubscriptionLoading />}>
          <SubscriptionContent searchParams={searchParams} />
        </Suspense>
      </div>

      <Footer variant="system" />
    </main>
  );
}
