"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Target,
} from "lucide-react";

interface Task {
  id: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status?: string;
  created_at: string;
  due_date?: string | null;
  tasks?: Task[];
  target_count?: number | null;
  target_label?: string | null;
}

interface ProjectListClientProps {
  initialProjects: Project[];
}

export default function ProjectListClient({
  initialProjects,
}: ProjectListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "in_progress" | "completed">("all");

  const filteredProjects = useMemo(() => {
    return initialProjects.filter((project) => {
      const totalTasks = project.tasks?.length || 0;
      const doneTasks =
        project.tasks?.filter((t) => t.status === "done").length || 0;
      const isCompleted = totalTasks > 0 && doneTasks === totalTasks;

      // Filter by Status Tab
      if (filterStatus === "in_progress" && isCompleted) return false;
      if (filterStatus === "completed" && !isCompleted) return false;

      // Filter by Search Query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchName = project.name.toLowerCase().includes(query);
        const matchDesc =
          project.description?.toLowerCase().includes(query) || false;
        return matchName || matchDesc;
      }

      return true;
    });
  }, [initialProjects, searchQuery, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Search Bar & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาโปรเจกต์..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ล้าง
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center p-1 bg-muted/60 rounded-xl border text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-lg ${
              filterStatus === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ทั้งหมด ({initialProjects.length})
          </button>
          <button
            onClick={() => setFilterStatus("in_progress")}
            className={`px-3 py-1.5 rounded-lg ${
              filterStatus === "in_progress"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            กำลังทำ
          </button>
          <button
            onClick={() => setFilterStatus("completed")}
            className={`px-3 py-1.5 rounded-lg ${
              filterStatus === "completed"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl bg-card/40">
          <Layers className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <p className="font-semibold text-foreground">ไม่พบโปรเจกต์ที่ตรงกับเงื่อนไข</p>
          <p className="text-xs text-muted-foreground mt-1">
            ลองปรับเปลี่ยนคำค้นหา หรือเลือกตัวกรองสถานะอื่น
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const totalTasks = project.tasks?.length || 0;
            const doneTasks =
              project.tasks?.filter((t) => t.status === "done").length || 0;
            const progress =
              totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
            const isCompleted = totalTasks > 0 && doneTasks === totalTasks;

            return (
              <Link href={`/system/projects/${project.id}`} key={project.id}>
                <div className="group bg-card border rounded-2xl p-6 hover:border-primary/50 hover:shadow-md cursor-pointer h-full flex flex-col relative overflow-hidden">
                  {/* Top status indicator strip */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      isCompleted ? "bg-emerald-500" : "bg-primary"
                    }`}
                  />

                  <div className="flex items-start gap-4 mb-4 pt-1">
                    <div
                      className={`p-3 rounded-xl ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <FolderKanban className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-base line-clamp-1 group-hover:text-primary">
                          {project.name}
                        </h3>
                        {isCompleted && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full shrink-0">
                            เสร็จแล้ว
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {project.description || "ไม่มีคำอธิบายเพิ่มเติม"}
                      </p>

                      {project.target_count && project.target_count > 0 && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                          <Target className="w-3.5 h-3.5" />
                          <span>
                            เป้าหมาย: {doneTasks} / {project.target_count} {project.target_label || "งาน"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress & Meta Info */}
                  <div className="mt-auto pt-4 border-t space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-medium">
                        {doneTasks}/{totalTasks} ภารกิจ
                      </span>
                      <span
                        className={`font-bold ${
                          isCompleted ? "text-emerald-600" : "text-primary"
                        }`}
                      >
                        {progress}%
                      </span>
                    </div>

                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isCompleted ? "bg-emerald-500" : "bg-primary"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(project.created_at).toLocaleDateString("th-TH")}
                      </span>
                      {totalTasks === 0 && (
                        <span className="text-amber-500 font-medium">
                          ยังไม่มีงานย่อย
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
