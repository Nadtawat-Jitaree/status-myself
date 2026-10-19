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

  if (project?.tasks) {
    project.tasks.sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  return project;
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
  const project = await getProjectDetails(id);
  return <ProjectClient project={project} />;
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
