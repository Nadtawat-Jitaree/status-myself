import { Suspense } from "react";
import { getProjects, createProject } from "@/app/actions/projects";
import Link from "next/link";
import { FolderKanban, Plus, Calendar } from "lucide-react";
import Image from "next/image";

function ProjectsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-card border rounded-xl p-6 h-[200px] flex flex-col animate-pulse"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-muted rounded-lg" />
            <div className="space-y-2 flex-1 pt-1">
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </div>
          <div className="mt-auto pt-4 border-t space-y-3">
            <div className="flex justify-between">
              <div className="h-4 bg-muted rounded w-16" />
              <div className="h-4 bg-muted rounded w-8" />
            </div>
            <div className="h-2 bg-muted rounded-full w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function ProjectList() {
  const projects = await getProjects();

  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
        ยังไม่มีโปรเจค เริ่มสร้างโปรเจคแรกของคุณได้เลย
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => {
        const totalTasks = project.tasks?.length || 0;
        const doneTasks =
          project.tasks?.filter((t: any) => t.status === "done").length || 0;
        const progress =
          totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

        return (
          <Link href={`/system/projects/${project.id}`} key={project.id}>
            <div className="group bg-card border rounded-xl p-6 hover:border-primary/50 transition-all cursor-pointer h-full flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg text-primary transition-transform">
                  <FolderKanban className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {project.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                    {project.description || "ไม่มีรายละเอียด"}
                  </p>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(project.created_at).toLocaleDateString("th-TH")}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <div className="container mx-auto px-8 py-9 max-w-5xl flex flex-col gap-8 border-2 rounded-3xl relative">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Image
            src="/normal.webp"
            alt="Project"
            width={45}
            height={45}
            className="mr-2"
            unoptimized
          ></Image>
          Projuect
        </h1>
        <p className="text-muted-foreground mt-2">
          จัดการและติดตามความคืบหน้าของโปรเจคทั้งหมด
        </p>
      </div>

      <div className="bg-card border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          สร้างโปรเจคใหม่
        </h2>
        <form action={createProject} className="lg:flex gap-4 items-end">
          <div className="lg:flex-1 space-y-2">
            <label className="text-sm font-medium">ชื่อโปรเจค</label>
            <input
              type="text"
              name="name"
              required
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="เช่น พัฒนาระบบ CRM..."
            />
          </div>
          <div className="lg:flex-1 space-y-2">
            <label className="text-sm font-medium">
              รายละเอียด (ไม่บังคับ)
            </label>
            <input
              type="text"
              name="description"
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="เป้าหมายของโปรเจค..."
            />
          </div>
          <div className="flex justify-end lg:block lg:justify-start">
            <button
              type="submit"
              className="mt-2 lg:mt-0 h-10 px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium transition-colors"
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>

      <Suspense fallback={<ProjectsSkeleton />}>
        <ProjectList />
      </Suspense>
    </div>
  );
}
