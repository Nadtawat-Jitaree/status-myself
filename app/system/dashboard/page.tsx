import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

function DashboardSkeleton() {
  return (
    <div className="w-full max-w-3xl grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-100 border border-gray-200 shadow-sm animate-pulse h-[90px]"
        >
          <div className="w-16 h-4 bg-gray-200 rounded mb-2"></div>
          <div className="w-10 h-8 bg-gray-300 rounded"></div>
        </div>
      ))}
    </div>
  );
}

async function DashboardSummary() {
  const statusCounts = {
    ทั่วไป: 0,
    สำคัญ: 0,
    งานค้าง: 0,
    เสร็จสิ้น: 0,
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: notes } = await supabase
      .from("notes")
      .select("status")
      .eq("user_id", user.id);

    if (notes) {
      notes.forEach((note) => {
        const status = note.status || "ทั่วไป";
        if (status in statusCounts) {
          statusCounts[status as keyof typeof statusCounts]++;
        }
      });
    }
  }

  return (
    <div className="w-full max-w-3xl grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 border border-gray-200 shadow-sm">
        <span className="text-gray-500 text-sm font-medium mb-1">ทั่วไป</span>
        <span className="text-3xl font-bold text-gray-700">
          {statusCounts["ทั่วไป"]}
        </span>
      </div>
      <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-red-50 border border-red-100 shadow-sm">
        <span className="text-red-500 text-sm font-medium mb-1">สำคัญ</span>
        <span className="text-3xl font-bold text-red-600">
          {statusCounts["สำคัญ"]}
        </span>
      </div>
      <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-orange-50 border border-orange-100 shadow-sm">
        <span className="text-orange-500 text-sm font-medium mb-1">
          งานค้าง
        </span>
        <span className="text-3xl font-bold text-orange-600">
          {statusCounts["งานค้าง"]}
        </span>
      </div>
      <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm">
        <span className="text-emerald-500 text-sm font-medium mb-1">
          เสร็จสิ้น
        </span>
        <span className="text-3xl font-bold text-emerald-600">
          {statusCounts["เสร็จสิ้น"]}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <main className="flex flex-col items-center w-full">
      <div className="flex-1 w-full flex flex-col items-center gap-10">
        <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col items-center justify-center p-8 gap-10">
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              สรุปภาพรวมและเลือกเมนูด้านล่างเพื่อเข้าสู่ระบบจัดการโน้ต
            </p>
          </div>

          {hasEnvVars && (
            <Suspense fallback={<DashboardSkeleton />}>
              <DashboardSummary />
            </Suspense>
          )}
          {/* <NoteCard /> */}
        </div>
      </div>
    </main>
  );
}
