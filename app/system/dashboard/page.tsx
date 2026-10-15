import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import DashboardCharts from "@/components/DashboardCharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FolderKanban,
  ListTodo,
  ArrowRight,
  BookOpen,
  Calendar,
} from "lucide-react";

function DashboardSkeleton() {
  return (
    <div className="w-full space-y-8 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted/60" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 rounded-2xl bg-muted/60" />
        <div className="h-72 rounded-2xl bg-muted/60" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-60 rounded-2xl bg-muted/60" />
        <div className="h-60 rounded-2xl bg-muted/60" />
      </div>
    </div>
  );
}

async function DashboardData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        กรุณาเข้าสู่ระบบเพื่อดูข้อมูลแดชบอร์ด
      </div>
    );
  }

  // 1. ดึงข้อมูลโน้ตทั้งหมดของผู้ใช้
  const { data: notes } = await supabase
    .from("notes")
    .select("id, title, content, status, created_at, category_id, note_categories(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 2. ดึงข้อมูลหมวดหมู่
  const { data: categories } = await supabase
    .from("note_categories")
    .select("id, name")
    .eq("user_id", user.id);

  // 3. ดึงข้อมูลโปรเจกต์และงานย่อย
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, created_at, tasks(id, status, title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // สรุปสถานะโน้ต
  const statusCounts = {
    ทั่วไป: 0,
    สำคัญ: 0,
    งานค้าง: 0,
    เสร็จสิ้น: 0,
  };

  const categoryCounts: Record<string, number> = {};

  if (notes) {
    notes.forEach((note) => {
      const status = note.status || "ทั่วไป";
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      }

      // นับตามหมวดหมู่
      const catName =
        (note.note_categories as any)?.name || "ไม่มีหมวดหมู่";
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });
  }

  // เตรียมข้อมูลสำหรับกราฟวงกลมสถานะ
  const statusChartData = [
    { name: "เสร็จสิ้น", value: statusCounts["เสร็จสิ้น"], color: "#10b981" },
    { name: "งานค้าง", value: statusCounts["งานค้าง"], color: "#f97316" },
    { name: "สำคัญ", value: statusCounts["สำคัญ"], color: "#ef4444" },
    { name: "ทั่วไป", value: statusCounts["ทั่วไป"], color: "#64748b" },
  ];

  // เตรียมข้อมูลสำหรับกราฟแท่งหมวดหมู่ (Top 5)
  const categoryChartData = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // โน้ตล่าสุด 4 รายการ
  const recentNotes = notes?.slice(0, 4) || [];

  // โปรเจกต์ล่าสุด 3 รายการ
  const activeProjects =
    projects?.slice(0, 3).map((p) => {
      const totalTasks = p.tasks?.length || 0;
      const doneTasks =
        p.tasks?.filter((t: any) => t.status === "done").length || 0;
      const progress =
        totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
      return {
        ...p,
        totalTasks,
        doneTasks,
        progress,
      };
    }) || [];

  return (
    <div className="w-full space-y-8">
      {/* 1. สรุปตัวเลข 4 การ์ด (Stat Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* ทั่วไป */}
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-card border shadow-sm transition hover:shadow-md">
          <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium block">
              ทั่วไป
            </span>
            <span className="text-2xl md:text-3xl font-bold text-foreground">
              {statusCounts["ทั่วไป"]}
            </span>
          </div>
        </div>

        {/* สำคัญ */}
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-card border shadow-sm transition hover:shadow-md">
          <div className="p-3 rounded-xl bg-red-50 text-red-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-red-500 font-medium block">
              สำคัญ
            </span>
            <span className="text-2xl md:text-3xl font-bold text-red-600">
              {statusCounts["สำคัญ"]}
            </span>
          </div>
        </div>

        {/* งานค้าง */}
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-card border shadow-sm transition hover:shadow-md">
          <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-orange-500 font-medium block">
              งานค้าง
            </span>
            <span className="text-2xl md:text-3xl font-bold text-orange-600">
              {statusCounts["งานค้าง"]}
            </span>
          </div>
        </div>

        {/* เสร็จสิ้น */}
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-card border shadow-sm transition hover:shadow-md">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-emerald-500 font-medium block">
              เสร็จสิ้น
            </span>
            <span className="text-2xl md:text-3xl font-bold text-emerald-600">
              {statusCounts["เสร็จสิ้น"]}
            </span>
          </div>
        </div>
      </div>

      {/* 2. กราฟวิเคราะห์ข้อมูล (Charts Section) */}
      <DashboardCharts
        statusData={statusChartData}
        categoryData={categoryChartData}
      />

      {/* 3. เซกชันความคืบหน้าโปรเจกต์ & บันทึกล่าสุด */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Progress */}
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-primary" />
                ความคืบหน้าโปรเจกต์
              </CardTitle>
              <CardDescription>
                โปรเจกต์และภารกิจย่อยที่กำลังดำเนินอยู่
              </CardDescription>
            </div>
            <Link
              href="/system/projects"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              ดูทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="pt-3 space-y-4">
            {activeProjects.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                ยังไม่มีโปรเจกต์{" "}
                <Link
                  href="/system/projects"
                  className="text-primary underline ml-1"
                >
                  สร้างโปรเจกต์แรกเลย
                </Link>
              </div>
            ) : (
              activeProjects.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-colors space-y-2"
                >
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-foreground truncate max-w-[200px]">
                      {p.name}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {p.doneTasks}/{p.totalTasks} งาน ({p.progress}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        p.progress === 100 ? "bg-emerald-500" : "bg-primary"
                      }`}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                บันทึกล่าสุด
              </CardTitle>
              <CardDescription>
                บันทึกและโน้ตที่มีการอัปเดตล่าสุด
              </CardDescription>
            </div>
            <Link
              href="/system/notes/normal"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              ดูทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            {recentNotes.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                ยังไม่มีบันทึกในระบบ{" "}
                <Link
                  href="/system/notes/normal"
                  className="text-primary underline ml-1"
                >
                  เพิ่มบันทึกใหม่
                </Link>
              </div>
            ) : (
              recentNotes.map((note) => {
                const statusBadgeColor =
                  note.status === "เสร็จสิ้น"
                    ? "bg-emerald-100 text-emerald-700"
                    : note.status === "งานค้าง"
                    ? "bg-orange-100 text-orange-700"
                    : note.status === "สำคัญ"
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-700";

                return (
                  <div
                    key={note.id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors text-sm"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="font-semibold text-foreground truncate">
                        {note.title}
                      </p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(note.created_at).toLocaleDateString("th-TH")}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${statusBadgeColor}`}
                    >
                      {note.status || "ทั่วไป"}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. ทางลัดด่วน (Quick Navigation) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <Link
          href="/system/notes/normal"
          className="flex items-center justify-between p-4 rounded-2xl border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                โน้ตทั่วไป
              </p>
              <p className="text-xs text-muted-foreground">บันทึกงานและเรื่องส่วนตัว</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-transform" />
        </Link>

        <Link
          href="/system/notes/school"
          className="flex items-center justify-between p-4 rounded-2xl border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                โน้ตการเรียน
              </p>
              <p className="text-xs text-muted-foreground">บันทึกวิชาและการบ้าน</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-transform" />
        </Link>

        <Link
          href="/system/projects"
          className="flex items-center justify-between p-4 rounded-2xl border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                โปรเจกต์ & ภารกิจ
              </p>
              <p className="text-xs text-muted-foreground">ติดตามความคืบหน้ารายงาน</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-transform" />
        </Link>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <main className="flex flex-col items-center w-full pb-16">
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              แดชบอร์ดภาพรวม (Dashboard)
            </h1>
            <p className="text-muted-foreground text-sm">
              สรุปข้อมูลสถิติการบันทึก ความคืบหน้าโปรเจกต์ และสถานะภารกิจทั้งหมด
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/system/notes/normal"
              className="inline-flex items-center justify-center text-sm font-medium h-9 px-4 rounded-xl border bg-card hover:bg-muted transition-colors"
            >
              จัดการโน้ต
            </Link>
            <Link
              href="/system/projects"
              className="inline-flex items-center justify-center text-sm font-medium h-9 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              ดูโปรเจกต์
            </Link>
          </div>
        </div>

        {hasEnvVars && (
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardData />
          </Suspense>
        )}
      </div>
    </main>
  );
}
