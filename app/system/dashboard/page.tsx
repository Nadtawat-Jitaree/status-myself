import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import DashboardCharts from "@/components/DashboardCharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  FileText,
  Star,
  Clock,
  CheckCircle2,
  FolderKanban,
  ArrowRight,
  Calendar,
  Sparkles,
  Pin,
  Plus,
  Compass,
  CheckCheck,
  ListTodo,
  TrendingUp,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

// Helper สำหรับวันที่ภาษาไทย
function formatThaiDate(date: Date) {
  const thaiDays = [
    "วันอาทิตย์",
    "วันจันทร์",
    "วันอังคาร",
    "วันพุธ",
    "วันพฤหัสบดี",
    "วันศุกร์",
    "วันเสาร์",
  ];
  const thaiMonths = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];

  const dayName = thaiDays[date.getDay()];
  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543;

  return `${dayName}ที่ ${day} ${month} ${year}`;
}

// Helper สำหรับคำทักทายตามช่วงเวลา
function getGreetingText() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "อรุณสวัสดิ์ยามเช้า";
  if (hour >= 12 && hour < 17) return "สวัสดีตอนบ่าย";
  if (hour >= 17 && hour < 21) return "สวัสดีตอนเย็น";
  return "สวัสดีรอบดึก";
}

// Skeleton Loading Screen ที่เข้าชุดกับโครงสร้างแดชบอร์ด
function DashboardLoading() {
  return (
    <div className="w-full min-w-0 space-y-6 sm:space-y-8 animate-pulse">
      {/* Hero Skeleton */}
      <div className="h-44 w-full rounded-3xl bg-muted/60" />

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-3xl bg-muted/60" />
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-3xl bg-muted/60" />
        <div className="h-80 rounded-3xl bg-muted/60" />
      </div>

      {/* Projects & Notes Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-3xl bg-muted/60" />
        <div className="h-72 rounded-3xl bg-muted/60" />
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
      <div className="rounded-3xl border border-dashed border-border p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-foreground">กรุณาเข้าสู่ระบบ</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          เข้าสู่ระบบเพื่อเข้าถึงแดชบอร์ดและข้อมูลงานของคุณ
        </p>
        <Link
          href="/auth/login"
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          เข้าสู่ระบบทันที
        </Link>
      </div>
    );
  }

  // ดึงข้อมูลพร้อมกันแบบ Parallel
  const [notesRes, categoriesRes, projectsRes, profileRes] = await Promise.all([
    supabase
      .from("notes")
      .select(
        "id, title, status, created_at, is_pinned, category_id, note_categories(id, name, note_type)",
      )
      .eq("user_id", user.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("note_categories")
      .select("id, name, note_type")
      .eq("user_id", user.id),
    supabase
      .from("projects")
      .select(
        "id, name, status, created_at, due_date, target_count, target_label, target_current, tasks(id, status, title, priority, due_date)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("fname, lname, username")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const notes = notesRes.data || [];
  const categories = categoriesRes.data || [];
  const projects = projectsRes.data || [];
  const profile = profileRes.data;

  // ชื่อผู้ใช้งานสำหรับทักทาย
  const displayName = profile?.fname
    ? `${profile.fname} ${profile.lname || ""}`.trim()
    : profile?.username || user.email?.split("@")[0] || "คุณ";

  // สรุปสถานะโน้ต
  const statusCounts = {
    ทั่วไป: 0,
    สำคัญ: 0,
    งานค้าง: 0,
    เสร็จสิ้น: 0,
  };

  const categoryCounts: Record<string, number> = {};
  let normalNotesCount = 0;
  let schoolNotesCount = 0;

  notes.forEach((note) => {
    const status = note.status || "ทั่วไป";
    if (status in statusCounts) {
      statusCounts[status as keyof typeof statusCounts]++;
    }

    const catData = note.note_categories as any;
    const catName = catData?.name || "ไม่มีหมวดหมู่";
    categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;

    if (catData?.note_type === "school") {
      schoolNotesCount++;
    } else {
      normalNotesCount++;
    }
  });

  const totalNotes = notes.length;
  const completionRate =
    totalNotes > 0
      ? Math.round((statusCounts["เสร็จสิ้น"] / totalNotes) * 100)
      : 0;

  // กราฟ Donut สถานะ
  const statusChartData = [
    { name: "เสร็จสิ้น", value: statusCounts["เสร็จสิ้น"], color: "#10b981" },
    { name: "งานค้าง", value: statusCounts["งานค้าง"], color: "#f59e0b" },
    { name: "สำคัญ", value: statusCounts["สำคัญ"], color: "#ef4444" },
    { name: "ทั่วไป", value: statusCounts["ทั่วไป"], color: "#6366f1" },
  ];

  // กราฟแท่ง Top 5 หมวดหมู่
  const categoryChartData = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // โน้ตล่าสุด 5 รายการ
  const recentNotes = notes.slice(0, 5);

  // ข้อมูลโปรเจกต์
  const activeProjects = projects.slice(0, 4).map((p) => {
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
  });

  // รวบรวมงานค้างเร่งด่วนจากทุกโปรเจกต์ (Pending Tasks)
  const pendingTasks = projects
    .flatMap((p) =>
      (p.tasks || []).map((t: any) => ({
        ...t,
        projectName: p.name,
        projectId: p.id,
      })),
    )
    .filter((t) => t.status !== "done")
    .slice(0, 4);

  const todayStr = formatThaiDate(new Date());
  const greeting = getGreetingText();

  return (
    <div className="w-full min-w-0 space-y-6 sm:space-y-8">
      {/* 1. Hero Welcome Banner (Monochrome / Black & White Gradient) */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80  p-5 sm:p-8 shadow-xs">
        {/* Monochrome Glow Effects */}
        <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full " />
        <div className="pointer-events-none absolute -right-12 -bottom-12 h-44 w-44 rounded-full " />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2.5 max-w-2xl">
            {/* Thai Date Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow-xs">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{todayStr}</span>
            </div>

            {/* Title Greeting */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              {greeting},{" "}
              <span className="text-black dark:text-white font-extrabold">
                {displayName}
              </span>{" "}
              👋
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              ภาพรวมการทำงานวันนี้: คุณมีโน้ตสำคัญ{" "}
              <span className="font-semibold text-red-500">
                {statusCounts["สำคัญ"]}
              </span>{" "}
              รายการ, งานค้าง{" "}
              <span className="font-semibold text-amber-500">
                {statusCounts["งานค้าง"]}
              </span>{" "}
              รายการ และสำเร็จไปแล้ว{" "}
              <span className="font-semibold text-emerald-500">
                {statusCounts["เสร็จสิ้น"]}
              </span>{" "}
              รายการ
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <Button asChild size="sm" className="text-white shadow-xs">
              <Link
                href="/system/notes/normal"
                className="flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>บันทึกโน้ตใหม่</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="shadow-xs">
              <Link
                href="/system/calendar"
                className="flex items-center gap-1.5"
              >
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>ปฏิทินวันนี้</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="shadow-xs">
              <Link
                href="/system/projects"
                className="flex items-center gap-1.5"
              >
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <span>โปรเจกต์</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards (4 Cards Grid with Color Theme) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Card 1: โน้ตทั้งหมด */}
        <div className="group relative overflow-hidden rounded-3xl border border-blue-200/50 dark:border-blue-900/30 bg-gradient-to-br from-blue-500/10 via-card to-card p-4 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-blue-400/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              บันทึกทั้งหมด
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 group-hover:scale-110 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {totalNotes}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">รายการ</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>ทั่วไป {normalNotesCount}</span>
            <span>•</span>
            <span>เรียน {schoolNotesCount}</span>
          </div>
        </div>

        {/* Card 2: สำเร็จแล้ว */}
        <div className="group relative overflow-hidden rounded-3xl border border-emerald-200/50 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-4 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-emerald-400/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              เสร็จสิ้นสมบูรณ์
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
              {statusCounts["เสร็จสิ้น"]}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">รายการ</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-emerald-600">
              {completionRate}%
            </span>
          </div>
        </div>

        {/* Card 3: งานค้าง */}
        <div className="group relative overflow-hidden rounded-3xl border border-amber-200/50 dark:border-amber-900/30 bg-gradient-to-br from-amber-500/10 via-card to-card p-4 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-amber-400/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              งานค้าง & รอดำเนินการ
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
              {statusCounts["งานค้าง"]}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">รายการ</span>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>กำลังรอจัดการให้ลุล่วง</span>
          </div>
        </div>

        {/* Card 4: โน้ตสำคัญ */}
        <div className="group relative overflow-hidden rounded-3xl border border-rose-200/50 dark:border-rose-900/30 bg-gradient-to-br from-rose-500/10 via-card to-card p-4 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-rose-400/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              สำคัญ & เร่งด่วน
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 group-hover:scale-110 transition-transform">
              <Star className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
              {statusCounts["สำคัญ"]}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">รายการ</span>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span>ต้องให้ความสำคัญลำดับแรก</span>
          </div>
        </div>
      </div>

      {/* 3. สถิติและกราฟวิเคราะห์ (Charts Section) */}
      <DashboardCharts
        statusData={statusChartData}
        categoryData={categoryChartData}
        totalNotes={totalNotes}
        completionRate={completionRate}
      />

      {/* 4. คอลัมน์คู่: โปรเจกต์ที่กำลังทำ & บันทึกล่าสุด */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Active Projects & Progress */}
        <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                  <FolderKanban className="h-4 w-4" />
                </span>
                <span>ความคืบหน้าโปรเจกต์</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                ติดตามขั้นตอนงานและภารกิจที่กำลังดำเนินอยู่
              </CardDescription>
            </div>
            <Link
              href="/system/projects"
              className="inline-flex items-center gap-1 rounded-xl bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-600 transition-colors hover:bg-purple-500/20"
            >
              ดูทั้งหมด <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>

          <CardContent className="space-y-3 pt-1">
            {activeProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
                  <FolderKanban className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  ยังไม่มีโปรเจกต์ในระบบ
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  สร้างโปรเจกต์แรกเพื่อวางแผนและติดตามภารกิจ
                </p>
                <Link
                  href="/system/projects"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3.5 w-3.5" /> สร้างโปรเจกต์ใหม่
                </Link>
              </div>
            ) : (
              activeProjects.map((p) => {
                const isCompleted = p.progress === 100;

                return (
                  <Link
                    key={p.id}
                    href={`/system/projects/${p.id}`}
                    className="group block rounded-2xl border border-border/50 bg-card p-3.5 transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-800 hover:shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold text-sm text-foreground group-hover:text-purple-600 transition-colors">
                            {p.name}
                          </span>
                          {p.target_count && (
                            <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                              เป้าหมาย {p.target_count}{" "}
                              {p.target_label || "ชิ้น"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-xs font-bold text-foreground">
                          {p.progress}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-purple-700 dark:bg-purple-600 transition-all duration-500"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        สำเร็จ {p.doneTasks} จาก {p.totalTasks} ภารกิจ
                      </span>
                      {p.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(p.due_date).toLocaleDateString("th-TH")}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right: Recent Notes & Pinned */}
        <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                  <FileText className="h-4 w-4" />
                </span>
                <span>บันทึกล่าสุด</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                โน้ตที่มีการเขียนหรืออัปเดตใหม่ล่าสุด
              </CardDescription>
            </div>
            <Link
              href="/system/notes/normal"
              className="inline-flex items-center gap-1 rounded-xl bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-500/20"
            >
              ดูทั้งหมด <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>

          <CardContent className="space-y-2.5 pt-1">
            {recentNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  ยังไม่มีบันทึกในระบบ
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  จดไอเดีย งาน หรือเนื้อหาการเรียนลงในบันทึกของคุณ
                </p>
                <Link
                  href="/system/notes/normal"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3.5 w-3.5" /> เขียนบันทึกใหม่
                </Link>
              </div>
            ) : (
              recentNotes.map((note) => {
                const catData = note.note_categories as any;
                const isSchool = catData?.note_type === "school";
                const targetLink = isSchool
                  ? "/system/notes/school"
                  : "/system/notes/normal";

                // สีสถานะ
                const statusStyle =
                  note.status === "เสร็จสิ้น"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : note.status === "งานค้าง"
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      : note.status === "สำคัญ"
                        ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                        : "bg-slate-500/10 text-slate-600 border-slate-500/20";

                return (
                  <Link
                    key={note.id}
                    href={targetLink}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card p-3 transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {note.is_pinned && (
                          <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                          {note.title}
                        </p>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {catData?.name && (
                          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                            {catData.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="h-3 w-3" />
                          {new Date(note.created_at).toLocaleDateString(
                            "th-TH",
                          )}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusStyle}`}
                    >
                      {note.status || "ทั่วไป"}
                    </span>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. ภารกิจที่ต้องทำ (Upcoming & Pending Tasks across projects) */}
      {pendingTasks.length > 0 && (
        <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-card via-card to-amber-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <ListTodo className="h-4 w-4" />
                </span>
                <span>ภารกิจที่ต้องดำเนินการต่อ</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                รายการย่อยในโปรเจกต์ที่ยังรอทำให้เสร็จสมบูรณ์
              </CardDescription>
            </div>
            <Link
              href="/system/projects"
              className="inline-flex items-center gap-1 rounded-xl bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500/20"
            >
              จัดการภารกิจ <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pendingTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/system/projects/${task.projectId}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-background/80 p-3 hover:border-amber-300 dark:hover:border-amber-800 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {task.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      โปรเจกต์: {task.projectName}
                    </p>
                  </div>
                  {task.priority && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        task.priority === "high"
                          ? "bg-rose-500/10 text-rose-600"
                          : task.priority === "medium"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-blue-500/10 text-blue-600"
                      }`}
                    >
                      {task.priority === "high"
                        ? "ด่วนมาก"
                        : task.priority === "medium"
                          ? "ปานกลาง"
                          : "ทั่วไป"}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. ทางลัดพื้นที่ทำงาน NJ Notes (Themed Hub Navigation) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Compass className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-sm font-bold text-foreground">
              พื้นที่ทำงานหลัก (Workspace Shortcuts)
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            เข้าถึงระบบในคลิกเดียว
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1. โน้ตทั่วไป */}
          <Link
            href="/system/notes/normal"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-blue-200/60 dark:border-blue-900/40 bg-gradient-to-b from-card to-blue-500/5 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100/80 p-2 text-blue-600">
                <Image
                  src="/note.webp"
                  alt="โน้ตทั่วไป"
                  width={34}
                  height={34}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-blue-600" />
            </div>
            <div className="mt-3">
              <h4 className="font-bold text-sm text-foreground group-hover:text-blue-600 transition-colors">
                โน้ตทั่วไป
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                จดบันทึกและเรื่องส่วนตัว
              </p>
            </div>
          </Link>

          {/* 2. โน้ตมหาวิทยาลัย */}
          <Link
            href="/system/notes/school"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-emerald-200/60 dark:border-emerald-900/40 bg-gradient-to-b from-card to-emerald-500/5 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-400 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/80 p-2 text-emerald-600">
                <Image
                  src="/school.webp"
                  alt="โน้ตมหาวิทยาลัย"
                  width={34}
                  height={34}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-emerald-600" />
            </div>
            <div className="mt-3">
              <h4 className="font-bold text-sm text-foreground group-hover:text-emerald-600 transition-colors">
                โน้ตการเรียน
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                วิชาเรียน การบ้าน และสอบ
              </p>
            </div>
          </Link>

          {/* 3. โปรเจกต์ & ภารกิจ */}
          <Link
            href="/system/projects"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-purple-200/60 dark:border-purple-900/40 bg-gradient-to-b from-card to-purple-500/5 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-purple-400 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100/80 p-2 text-purple-600">
                <Image
                  src="/normal.webp"
                  alt="โปรเจกต์"
                  width={34}
                  height={34}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-purple-600" />
            </div>
            <div className="mt-3">
              <h4 className="font-bold text-sm text-foreground group-hover:text-purple-600 transition-colors">
                โปรเจกต์
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                ติดตามขั้นตอนรายงาน
              </p>
            </div>
          </Link>

          {/* 4. ปฏิทินรายวัน */}
          <Link
            href="/system/calendar"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-b from-card to-amber-500/5 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/80 p-2 text-amber-600">
                <Image
                  src="/all.webp"
                  alt="ปฏิทิน"
                  width={34}
                  height={34}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-amber-600" />
            </div>
            <div className="mt-3">
              <h4 className="font-bold text-sm text-foreground group-hover:text-amber-600 transition-colors">
                ปฏิทิน & บันทึก
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                กิจกรรมและบันทึกประจำวัน
              </p>
            </div>
          </Link>

          {/* 5. ทักษะ & แต้มสะสม */}
          <Link
            href="/system/qualities"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-indigo-200/60 dark:border-indigo-900/40 bg-gradient-to-b from-card to-indigo-500/5 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100/80 p-2 text-indigo-600">
                <Image
                  src="/skills.png"
                  alt="ทักษะ"
                  width={34}
                  height={34}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
            </div>
            <div className="mt-3">
              <h4 className="font-bold text-sm text-foreground group-hover:text-indigo-600 transition-colors">
                ทักษะ & แต้ม
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                พัฒนาตนเองและคะแนน
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <main className="flex flex-col items-center w-full pb-16">
      <div className="w-full max-w-6xl min-w-0 mx-auto flex flex-col gap-6 px-0 sm:gap-8">
        {hasEnvVars && (
          <Suspense fallback={<DashboardLoading />}>
            <DashboardData />
          </Suspense>
        )}
      </div>
    </main>
  );
}
