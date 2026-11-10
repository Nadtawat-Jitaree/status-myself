"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban,
  Calendar,
  Search,
  CheckCircle2,
  Layers,
  Target,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  FolderOpen,
} from "lucide-react";
import type { ProjectSummary, ProjectsPagedResponse } from "@/app/actions/projects";
import type { PaginationData } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "in_progress" | "completed" | "empty";

// ─── Pagination Component ─────────────────────────────────────────────
function ProjectPagination({
  pagination,
  onPageChange,
  isPending,
}: {
  pagination: PaginationData;
  onPageChange: (page: number) => void;
  isPending: boolean;
}) {
  const {
    currentPage,
    totalPages,
    hasPrevPage,
    hasNextPage,
    prevPage,
    nextPage,
    startIndex,
    endIndex,
    totalCount,
    items,
  } = pagination;

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-border/60">
      {/* รายละเอียดจำนวนรายการ */}
      <p className="text-xs text-muted-foreground font-medium order-2 sm:order-1">
        แสดง{" "}
        <span className="font-semibold text-foreground">{startIndex}</span>
        {" – "}
        <span className="font-semibold text-foreground">{endIndex}</span>{" "}
        จากทั้งหมด{" "}
        <span className="font-semibold text-foreground">{totalCount}</span>{" "}
        โปรเจกต์
      </p>

      {/* Navigation Controls */}
      <nav
        aria-label="Project Pagination"
        className={cn(
          "flex items-center gap-1.5 order-1 sm:order-2",
          isPending && "opacity-60 pointer-events-none"
        )}
      >
        {/* First Page */}
        {totalPages > 5 && (
          <button
            onClick={() => onPageChange(1)}
            disabled={!hasPrevPage || isPending}
            aria-label="หน้าแรก"
            className={cn(
              "p-2 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 hidden sm:flex items-center justify-center",
              !hasPrevPage && "opacity-30 pointer-events-none"
            )}
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}

        {/* Prev */}
        <button
          onClick={() => onPageChange(prevPage || 1)}
          disabled={!hasPrevPage || isPending}
          aria-label="หน้าก่อนหน้า"
          className={cn(
            "p-2 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 flex items-center justify-center",
            !hasPrevPage && "opacity-30 pointer-events-none"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Pills */}
        <div className="flex items-center gap-1">
          {items.map((item) => {
            if (item.type === "ellipsis") {
              return (
                <span
                  key={item.key}
                  className="w-8 h-9 flex items-center justify-center text-muted-foreground text-xs select-none"
                >
                  •••
                </span>
              );
            }
            const pageNum = item.page!;
            const isActive = currentPage === pageNum;
            return (
              <button
                key={item.key}
                onClick={() => onPageChange(pageNum)}
                disabled={isActive || isPending}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "min-w-9 h-9 px-2 flex items-center justify-center rounded-xl text-xs font-semibold transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm scale-105 pointer-events-none"
                    : "bg-background border border-border text-foreground hover:bg-muted/60 hover:border-primary/40 active:scale-95"
                )}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next */}
        <button
          onClick={() => onPageChange(nextPage || totalPages)}
          disabled={!hasNextPage || isPending}
          aria-label="หน้าถัดไป"
          className={cn(
            "p-2 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 flex items-center justify-center",
            !hasNextPage && "opacity-30 pointer-events-none"
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        {totalPages > 5 && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNextPage || isPending}
            aria-label="หน้าสุดท้าย"
            className={cn(
              "p-2 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 hidden sm:flex items-center justify-center",
              !hasNextPage && "opacity-30 pointer-events-none"
            )}
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </nav>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────
function ProjectCard({ project }: { project: ProjectSummary }) {
  const { total, done, progress } = project.taskSummary;
  const isCompleted = total > 0 && done === total;
  const isEmpty = total === 0;

  return (
    <Link href={`/system/projects/${project.id}`}>
      <div className="group bg-card border border-border/60 rounded-2xl p-6 hover:border-primary/50 hover:shadow-md cursor-pointer h-full flex flex-col relative overflow-hidden transition-all duration-200">
        {/* Top status indicator strip */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-1",
            isCompleted
              ? "bg-emerald-500"
              : isEmpty
              ? "bg-muted"
              : "bg-primary"
          )}
        />

        <div className="flex items-start gap-4 mb-4 pt-1">
          <div
            className={cn(
              "p-3 rounded-xl shrink-0",
              isCompleted
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                : isEmpty
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary"
            )}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : isEmpty ? (
              <FolderOpen className="w-6 h-6" />
            ) : (
              <FolderKanban className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-bold text-base line-clamp-1 group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              {isCompleted && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full shrink-0 border border-emerald-200 dark:border-emerald-800">
                  เสร็จแล้ว ✓
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
              {project.description || "ไม่มีคำอธิบายเพิ่มเติม"}
            </p>

            {project.target_count && project.target_count > 0 && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                <Target className="w-3.5 h-3.5" />
                <span>
                  เป้าหมาย: {done} / {project.target_count}{" "}
                  {project.target_label || "งาน"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Progress & Meta */}
        <div className="mt-auto pt-4 border-t border-border/50 space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              {isEmpty ? "ยังไม่มีงานย่อย" : `${done}/${total} ภารกิจ`}
            </span>
            <span
              className={cn(
                "font-bold",
                isCompleted
                  ? "text-emerald-600"
                  : isEmpty
                  ? "text-muted-foreground"
                  : "text-primary"
              )}
            >
              {progress}%
            </span>
          </div>

          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isCompleted ? "bg-emerald-500" : isEmpty ? "bg-transparent" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(project.created_at).toLocaleDateString("th-TH")}
            </span>
            {project.due_date && (
              <span className="text-amber-500 font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                กำหนด: {new Date(project.due_date).toLocaleDateString("th-TH")}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────
export default function ProjectListClient({ initialData }: { initialData: ProjectsPagedResponse }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localSearch, setLocalSearch] = useState(searchParams.get("q") || "");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>(
    (searchParams.get("status") as StatusFilter) || "all"
  );

  const { projects, pagination, statusCounts } = initialData;

  const navigate = useCallback(
    (overrides: { page?: number; q?: string; status?: StatusFilter }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (overrides.page !== undefined) {
        if (overrides.page === 1) params.delete("page");
        else params.set("page", String(overrides.page));
      }
      if (overrides.q !== undefined) {
        if (overrides.q === "") params.delete("q");
        else params.set("q", overrides.q);
        params.delete("page");
      }
      if (overrides.status !== undefined) {
        if (overrides.status === "all") params.delete("status");
        else params.set("status", overrides.status);
        params.delete("page");
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ q: localSearch });
  };

  const handleFilterStatus = (status: StatusFilter) => {
    setFilterStatus(status);
    navigate({ status });
  };

  const handlePageChange = (page: number) => {
    navigate({ page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const statusTabs: { id: StatusFilter; label: string; count: number }[] = [
    { id: "all", label: "ทั้งหมด", count: statusCounts.all },
    { id: "in_progress", label: "กำลังทำ", count: statusCounts.in_progress },
    { id: "completed", label: "เสร็จสิ้น", count: statusCounts.completed },
    { id: "empty", label: "ยังว่าง", count: statusCounts.empty },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Search & Filter Bar ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="ค้นหาโปรเจกต์..."
              className="w-full h-10 pl-10 pr-9 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => { setLocalSearch(""); navigate({ q: "" }); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ล้าง
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 shrink-0 flex items-center gap-1.5"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            ค้นหา
          </button>
        </form>

        {/* Status Filter Tabs */}
        <div className="flex items-center p-1 bg-muted/50 rounded-xl border border-border/60 text-xs font-medium self-start sm:self-auto gap-0.5">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleFilterStatus(tab.id)}
              disabled={isPending}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap",
                filterStatus === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                  filterStatus === tab.id
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>กำลังโหลด...</span>
        </div>
      )}

      {/* ─── Projects Grid ─── */}
      {projects.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl bg-card/40">
          <Layers className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <p className="font-semibold text-foreground">ไม่พบโปรเจกต์ที่ตรงกับเงื่อนไข</p>
          <p className="text-xs text-muted-foreground mt-1">
            ลองปรับเปลี่ยนคำค้นหา หรือเลือกตัวกรองสถานะอื่น
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200",
            isPending && "opacity-50"
          )}
        >
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* ─── Pagination ─── */}
      <ProjectPagination
        pagination={pagination}
        onPageChange={handlePageChange}
        isPending={isPending}
      />
    </div>
  );
}
