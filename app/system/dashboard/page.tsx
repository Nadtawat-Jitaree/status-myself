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
  LoaderCircle,
} from "lucide-react";

function DashboardLoading() {
  return (
    <div
      className="flex min-h-[240px] w-full flex-col items-center justify-center gap-3 rounded-2xl border bg-card px-4 py-8 text-center sm:min-h-[320px] sm:gap-4 sm:py-12"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle
        className="h-8 w-8 animate-spin text-primary sm:h-10 sm:w-10"
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground sm:text-base">
          กำลังโหลดข้อมูลแดชบอร์ด
        </p>
        <p className="text-xs text-muted-foreground sm:text-sm">
          กรุณารอสักครู่
        </p>
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

  // ดึงข้อมูลโน้ต, หมวดหมู่ และโปรเจกต์พร้อมกันแบบ Parallel (ลด Roundtrips ด้วย Promise.all)
  // ตัดคอลัมน์ content ออกเพื่อลดขนาด Payload เพราะแดชบอร์ดใช้เพียงตัวเลขสรุปและหัวข้อ
  const [notesRes, categoriesRes, projectsRes] = await Promise.all([
    supabase
      .from("notes")
      .select("id, title, status, created_at, category_id, note_categories(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("note_categories")
      .select("id, name")
      .eq("user_id", user.id),
    supabase
      .from("projects")
      .select("id, name, status, created_at, tasks(id, status, title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const notes = notesRes.data;
  const categories = categoriesRes.data;
  const projects = projectsRes.data;

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
    <div className="w-full min-w-0 space-y-6 sm:space-y-8">
      {/* 1. สรุปตัวเลข 4 การ์ด (Stat Cards) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {/* ทั่วไป */}
        <div className="flex min-w-0 items-center gap-2 p-3 rounded-2xl bg-card border sm:gap-4 sm:p-5">
          <div className="shrink-0 rounded-xl bg-slate-100 p-2 text-slate-600 sm:p-3">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-muted-foreground font-medium block">
              ทั่วไป
            </span>
            <span className="text-2xl font-bold text-foreground sm:text-3xl">
              {statusCounts["ทั่วไป"]}
            </span>
          </div>
        </div>

        {/* สำคัญ */}
        <div className="flex min-w-0 items-center gap-2 p-3 rounded-2xl bg-card border sm:gap-4 sm:p-5">
          <div className="shrink-0 rounded-xl bg-red-50 p-2 text-red-600 sm:p-3">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-red-500 font-medium block">
              สำคัญ
            </span>
            <span className="text-2xl font-bold text-red-600 sm:text-3xl">
              {statusCounts["สำคัญ"]}
            </span>
          </div>
        </div>

        {/* งานค้าง */}
        <div className="flex min-w-0 items-center gap-2 p-3 rounded-2xl bg-card border sm:gap-4 sm:p-5">
          <div className="shrink-0 rounded-xl bg-orange-50 p-2 text-orange-600 sm:p-3">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-orange-500 font-medium block">
              งานค้าง
            </span>
            <span className="text-2xl font-bold text-orange-600 sm:text-3xl">
              {statusCounts["งานค้าง"]}
            </span>
          </div>
        </div>

        {/* เสร็จสิ้น */}
        <div className="flex min-w-0 items-center gap-2 p-3 rounded-2xl bg-card border sm:gap-4 sm:p-5">
          <div className="shrink-0 rounded-xl bg-emerald-50 p-2 text-emerald-600 sm:p-3">
            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-emerald-500 font-medium block">
              เสร็จสิ้น
            </span>
            <span className="text-2xl font-bold text-emerald-600 sm:text-3xl">
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
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Project Progress */}
        <Card className="min-w-0 rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
                <FolderKanban className="h-5 w-5 shrink-0 text-primary" />
                ความคืบหน้าโปรเจกต์
              </CardTitle>
              <CardDescription>
                โปรเจกต์และภารกิจย่อยที่กำลังดำเนินอยู่
              </CardDescription>
            </div>
            <Link
              href="/system/projects"
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
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
                  className="p-3.5 rounded-xl border bg-card hover:bg-muted/30 space-y-2"
                >
                  <div className="flex min-w-0 items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
                      {p.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground font-medium">
                      {p.doneTasks}/{p.totalTasks} งาน ({p.progress}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
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
        <Card className="min-w-0 rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                บันทึกล่าสุด
              </CardTitle>
              <CardDescription>
                บันทึกและโน้ตที่มีการอัปเดตล่าสุด
              </CardDescription>
            </div>
            <Link
              href="/system/notes/normal"
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
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
                    className="flex min-w-0 items-center justify-between gap-2 rounded-xl border bg-card p-3 text-sm hover:bg-muted/30"
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
      <div className="grid grid-cols-1 gap-3 pt-2 sm:gap-4 md:grid-cols-3">
        <Link
          href="/system/notes/normal"
          className="group flex min-w-0 items-center justify-between gap-3 rounded-2xl border bg-card p-4 hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm group-hover:text-primary">
                โน้ตทั่วไป
              </p>
              <p className="text-xs text-muted-foreground">บันทึกงานและเรื่องส่วนตัว</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary" />
        </Link>

        <Link
          href="/system/notes/school"
          className="group flex min-w-0 items-center justify-between gap-3 rounded-2xl border bg-card p-4 hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm group-hover:text-primary">
                โน้ตการเรียน
              </p>
              <p className="text-xs text-muted-foreground">บันทึกวิชาและการบ้าน</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary" />
        </Link>

        <Link
          href="/system/projects"
          className="group flex min-w-0 items-center justify-between gap-3 rounded-2xl border bg-card p-4 hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl bg-purple-50 p-2.5 text-purple-600">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm group-hover:text-primary">
                โปรเจกต์ & ภารกิจ
              </p>
              <p className="text-xs text-muted-foreground">ติดตามความคืบหน้ารายงาน</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary" />
        </Link>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <main className="flex flex-col items-center w-full pb-16">
      <div className="w-full max-w-6xl min-w-0 mx-auto flex flex-col gap-6 px-0 sm:gap-8">
        {/* Header */}
        <div className="flex min-w-0 flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              แดชบอร์ดภาพรวม (Dashboard)
            </h1>
            <p className="text-sm text-muted-foreground">
              สรุปข้อมูลสถิติการบันทึก ความคืบหน้าโปรเจกต์ และสถานะภารกิจทั้งหมด
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Link
              href="/system/notes/normal"
              className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border bg-card px-4 text-sm font-medium hover:bg-muted sm:flex-none"
            >
              จัดการโน้ต
            </Link>
            <Link
              href="/system/projects"
              className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 sm:flex-none"
            >
              ดูโปรเจกต์
            </Link>
          </div>
        </div>

        {hasEnvVars && (
          <Suspense fallback={<DashboardLoading />}>
            <DashboardData />
          </Suspense>
        )}
      </div>
    </main>
  );
}
