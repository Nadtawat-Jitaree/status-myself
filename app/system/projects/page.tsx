import { Suspense } from "react";
import { getProjectsPaginated } from "@/app/actions/projects";
import { requirePremiumAccess } from "@/lib/subscription";
import Image from "next/image";
import { LoaderCircle } from "lucide-react";
import ProjectListClient from "@/components/ProjectListClient";
import CreateProjectForm from "@/components/CreateProjectForm";

function ProjectsLoading() {
  return (
    <div className="space-y-5 sm:space-y-6" role="status" aria-live="polite">
      <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border bg-card px-4 py-6 text-center sm:min-h-44 sm:flex-row sm:gap-3 sm:py-8">
        <LoaderCircle
          className="h-7 w-7 animate-spin text-primary sm:h-8 sm:w-8"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground sm:text-base">
            กำลังโหลดข้อมูลโปรเจกต์
          </p>
          <p className="text-xs text-muted-foreground sm:text-sm">
            กรุณารอสักครู่
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex h-[200px] animate-pulse flex-col rounded-xl border bg-card p-4 sm:p-6"
            aria-hidden="true"
          >
            <div className="mb-4 flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
              </div>
            </div>
            <div className="mt-auto space-y-3 border-t pt-4">
              <div className="flex justify-between">
                <div className="h-4 w-16 rounded bg-muted" />
                <div className="h-4 w-8 rounded bg-muted" />
              </div>
              <div className="h-2 w-full rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProjectsPageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: "all" | "in_progress" | "completed" | "empty";
  }>;
}

async function ProjectList({ searchParams }: ProjectsPageProps) {
  await requirePremiumAccess();

  const resolved = await searchParams;
  const page = Math.max(1, parseInt(resolved.page || "1", 10));
  const search = (resolved.q || "").trim();
  const status = resolved.status || "all";

  const data = await getProjectsPaginated({ page, search, status });

  if (!data.statusCounts.all) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
        ยังไม่มีโปรเจกต์ เริ่มสร้างโปรเจกต์แรกของคุณได้เลย
      </div>
    );
  }

  return <ProjectListClient initialData={data} />;
}

export default function ProjectsPage({ searchParams }: ProjectsPageProps) {
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
          />
          โปรเจกต์
        </h1>
        <p className="text-muted-foreground mt-2">
          จัดการและติดตามความคืบหน้าของโปรเจกต์ทั้งหมด
        </p>
      </div>

      <CreateProjectForm />

      <Suspense fallback={<ProjectsLoading />}>
        <ProjectList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
