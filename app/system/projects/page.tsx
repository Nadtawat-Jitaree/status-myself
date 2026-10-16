import { Suspense } from "react";
import { getProjects, createProject } from "@/app/actions/projects";
import Link from "next/link";
import { FolderKanban, Plus, Calendar, LoaderCircle } from "lucide-react";
import Image from "next/image";
import ProjectListClient from "@/components/ProjectListClient";

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

async function ProjectList() {
  const projects = await getProjects();

  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
        ยังไม่มีโปรเจค เริ่มสร้างโปรเจคแรกของคุณได้เลย
      </div>
    );
  }

  return <ProjectListClient initialProjects={projects} />;
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
          Projects
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

      <Suspense fallback={<ProjectsLoading />}>
        <ProjectList />
      </Suspense>
    </div>
  );
}
