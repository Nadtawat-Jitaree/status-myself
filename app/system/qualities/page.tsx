import { Suspense } from "react";
import { getQualities, getQualityTransactions } from "@/app/actions/qualities";
import { QualityManager } from "@/components/QualityManager";
import { requirePremiumAccess } from "@/lib/subscription";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ทักษะ & แต้มสะสม | ระบบจัดการ",
  description: "จัดการทักษะและดูประวัติการสะสมแต้ม",
};

function QualityLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      <p className="text-sm font-semibold text-muted-foreground animate-pulse">
        กำลังโหลดข้อมูลทักษะและประวัติแต้ม...
      </p>
    </div>
  );
}

async function QualityDataContainer() {
  await requirePremiumAccess();
  const [qualities, transactions] = await Promise.all([
    getQualities(),
    getQualityTransactions(100),
  ]);

  return <QualityManager initialQualities={qualities} initialTransactions={transactions} />;
}

export default function QualitiesPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<QualityLoading />}>
        <QualityDataContainer />
      </Suspense>
    </div>
  );
}
