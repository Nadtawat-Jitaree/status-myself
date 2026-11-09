import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ProjectClient from "./ProjectClient";

async function getProjectDetails(id: string) {
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*, tasks(*)")
    .eq("id", id)
    .single();

  if (error) throw error;

  // ดึง task_qualities เพื่อนำมาแสดง badge และกำหนดค่าเริ่มต้นใน modal
  const taskIds = (project?.tasks || []).map((t: any) => t.id);
  const taskQualitiesMap: Record<string, any[]> = {};
  if (taskIds.length > 0) {
    try {
      const { data: tqData, error: tqError } = await supabase
        .from("task_qualities")
        .select("task_id, quality_id, level, qualities(id, name, icon, color)")
        .in("task_id", taskIds);
      if (!tqError && tqData) {
        for (const item of tqData) {
          if (!taskQualitiesMap[item.task_id]) {
            taskQualitiesMap[item.task_id] = [];
          }
          taskQualitiesMap[item.task_id].push({
            quality_id: item.quality_id,
            level: item.level,
            name: (item.qualities as any)?.name || "คุณสมบัติ",
            icon: (item.qualities as any)?.icon || "Star",
            color: (item.qualities as any)?.color || "#6366f1",
          });
        }
      }
    } catch {
      // ตาราง task_qualities อาจยังไม่ได้รัน migration
    }
  }

  if (project?.tasks) {
    project.tasks = project.tasks.map((task: any) => ({
      ...task,
      qualities: taskQualitiesMap[task.id] || [],
    }));

    project.tasks.sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  // ดึงรายการคุณสมบัติที่เปิดใช้งานทั้งหมดของผู้ใช้
  let availableQualities: any[] = [];
  try {
    const { data: qData } = await supabase
      .from("qualities")
      .select("*")
      .eq("user_id", project.user_id)
      .eq("is_active", true)
      .order("order_index", { ascending: true });
    availableQualities = qData || [];
  } catch {
    // qualities table อาจยังไม่มีข้อมูล
  }

  return { project, availableQualities };
}

function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-card border rounded-2xl p-8 h-[220px]">
        <div className="h-8 bg-muted rounded w-1/3 mb-4" />
        <div className="h-4 bg-muted rounded w-1/2 mb-8" />
        <div className="h-16 bg-muted rounded-xl w-full" />
      </div>
      <div className="bg-card border rounded-2xl p-8 min-h-[400px]">
        <div className="h-6 bg-muted rounded w-32 mb-6" />
        <div className="h-11 bg-muted rounded-lg w-full mb-8" />
        <div className="flex flex-col">
          {[1, 2, 3].map((i, index) => (
            <div key={i} className="flex flex-col">
              <div className="h-16 bg-muted rounded-xl w-full" />
              {index < 2 && (
                <div className="flex flex-col items-center justify-center py-2 opacity-30">
                  <div className="w-1 h-6 bg-muted rounded-full"></div>
                  <div className="bg-background border-2 border-muted p-1 rounded-full -mt-2 w-6 h-6"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function ProjectDataWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { project, availableQualities } = await getProjectDetails(id);
  return <ProjectClient project={project} availableQualities={availableQualities} />;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="container mx-auto px-4 py-9 max-w-5xl flex flex-col gap-8 border-2 rounded-3xl relative">
      <div>
        <Link
          href="/system/projects"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground     
                      h-10
                      flex-1
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      bg-background
                      px-3
                      font-medium
                      hover:border-primary/30
                      hover:bg-primary/5
                      sm:flex-none"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          back
        </Link>
      </div>

      <Suspense fallback={<ProjectDetailSkeleton />}>
        <ProjectDataWrapper params={params} />
      </Suspense>
    </div>
  );
}
