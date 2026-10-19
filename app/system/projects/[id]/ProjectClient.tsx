"use client";

import { useState, useEffect, useMemo } from "react";
import {
  updateProject,
  deleteProject,
  updateTaskStatus,
  createTask,
  deleteTask,
  updateTaskTitle,
  reorderTasks,
} from "@/app/actions/projects";

import {
  CheckCircle2,
  Circle,
  ListTodo,
  Plus,
  Timer,
  Pencil,
  Trash2,
  Save,
  X,
  GripVertical,
  Calendar,
  AlertCircle,
  Clock,
  ArrowDown,
  Loader2,
  CalendarDays,
  SlidersHorizontal,
  ChevronDown,
  Check,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

import Swal from "sweetalert2";

export default function ProjectClient({ project }: { project: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>(project.tasks || []);
  const [isMounted, setIsMounted] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "priority" | "due_date" | "custom"
  >("newest");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "todo" | "in_progress" | "done"
  >("all");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setTasks(project.tasks || []);
  }, [project.tasks]);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t: any) => t.status === "done").length;
  const progress =
    totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  const processedTasks = useMemo(() => {
    let list = [...tasks];

    // Filter by status if not "all"
    if (filterStatus !== "all") {
      list = list.filter((t: any) => t.status === filterStatus);
    }

    // Sort
    list.sort((a: any, b: any) => {
      if (sortBy === "newest") {
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      }
      if (sortBy === "oldest") {
        return (
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime()
        );
      }
      if (sortBy === "priority") {
        const pWeights: Record<string, number> = {
          high: 3,
          medium: 2,
          low: 1,
        };
        const diff =
          (pWeights[b.priority] || 2) - (pWeights[a.priority] || 2);
        if (diff !== 0) return diff;
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      }
      if (sortBy === "due_date") {
        if (a.due_date && b.due_date) {
          return (
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          );
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      }
      if (sortBy === "custom") {
        return (a.order_index ?? 0) - (b.order_index ?? 0);
      }
      return 0;
    });

    return list;
  }, [tasks, filterStatus, sortBy]);

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isAddingTask) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = (formData.get("title") as string)?.trim();
    if (!title) return;

    setIsAddingTask(true);
    try {
      await createTask(project.id, formData);
      form.reset();
    } catch (error) {
      console.error("Failed to create task:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเพิ่มงานได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleDeleteProject = async () => {
    const result = await Swal.fire({
      title: "ต้องการลบโปรเจคนี้?",
      text: "งานย่อยทั้งหมดในโปรเจคนี้จะถูกลบไปด้วย และไม่สามารถกู้คืนได้!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, ลบโปรเจค",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      await deleteProject(project.id);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const result = await Swal.fire({
      title: "ลบงานนี้?",
      text: "งานนี้จะถูกลบออกจากโปรเจค",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ลบเลย",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      await deleteTask(taskId, project.id);
    }
  };

  const handleUpdateProject = async (formData: FormData) => {
    await updateProject(project.id, formData);
    setIsEditing(false);
  };

  const handleUpdateTaskTitle = async (
    formData: FormData,
    taskId: string
  ) => {
    const newTitle = formData.get("title") as string;
    if (newTitle && newTitle.trim() !== "") {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t))
      );
      await updateTaskTitle(taskId, newTitle, project.id);
    }
    setEditingTaskId(null);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    const reordered = Array.from(tasks);
    reordered.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(destIndex, 0, moved);

    const updatedTasks = reordered.map((t: any, idx) => ({
      ...t,
      order_index: idx + 1,
    }));

    setTasks(updatedTasks);

    await reorderTasks(
      project.id,
      updatedTasks.map((t: any) => ({
        id: t.id,
        order_index: t.order_index,
      }))
    );
  };

  const renderPriorityBadge = (priority?: string) => {
    switch (priority) {
      case "high":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
            ด่วนมาก
          </span>
        );
      case "low":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            ทั่วไป
          </span>
        );
      case "medium":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            ปานกลาง
          </span>
        );
    }
  };

  const renderDueDateBadge = (dueDateStr?: string | null, status?: string) => {
    if (!dueDateStr) return null;
    const dueDate = new Date(dueDateStr);
    const now = new Date();
    // Normalize to date comparison
    const isOverdue =
      dueDate.getTime() < now.getTime() - 24 * 60 * 60 * 1000 &&
      status !== "done";
    const diffDays = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isDueSoon = diffDays >= 0 && diffDays <= 2 && status !== "done";

    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 animate-pulse">
          <AlertCircle className="w-3 h-3" />
          เลยกำหนด: {dueDate.toLocaleDateString("th-TH")}
        </span>
      );
    }

    if (isDueSoon) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" />
          ใกล้ครบกำหนด: {dueDate.toLocaleDateString("th-TH")}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground px-2.5 py-0.5 rounded-full bg-muted/60">
        <Calendar className="w-3 h-3" />
        ครบกำหนด: {dueDate.toLocaleDateString("th-TH")}
      </span>
    );
  };

  const renderCreatedDateBadge = (createdAtStr?: string) => {
    if (!createdAtStr) return null;
    const createdDate = new Date(createdAtStr);
    const formattedDate = createdDate.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const formattedTime = createdDate.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground px-2.5 py-0.5 rounded-full bg-muted/60"
        title={`สร้างเมื่อ: ${createdDate.toLocaleString("th-TH")}`}
      >
        <CalendarDays className="w-3 h-3 text-muted-foreground/70" />
        สร้าง: {formattedDate} {formattedTime} น.
      </span>
    );
  };

  const getTaskStyle = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-blue-50/60 border-blue-200";
      case "done":
        return "bg-emerald-50/60 border-emerald-200 opacity-90";
      default:
        return "bg-background border-border hover:border-primary/30";
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Project Overview Card */}
      <section className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {isEditing ? (
            <form action={handleUpdateProject} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  ชื่อโปรเจค
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={project.name}
                  required
                  className="h-11 w-full rounded-xl border border-input bg-background px-4 text-base font-semibold outline-none transition focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  รายละเอียด
                </label>
                <textarea
                  name="description"
                  defaultValue={project.description}
                  className="min-h-[100px] w-full resize-none rounded-xl border border-input bg-background p-4 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
                >
                  <Save className="h-4 w-4" />
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-muted transition"
                >
                  <X className="h-4 w-4" />
                  ยกเลิก
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {project.name}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {project.description || "ไม่มีรายละเอียด"}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-muted transition"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    แก้ไข
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    ลบโปรเจค
                  </button>
                </div>
              </div>

              {/* Progress Summary */}
              <div className="rounded-2xl border bg-muted/30 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      ความคืบหน้า
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-bold tracking-tight">
                        {progress}%
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {doneTasks}/{totalTasks} งานเสร็จแล้ว
                      </span>
                    </div>
                  </div>

                  <div className="w-full sm:max-w-sm sm:flex-1">
                    <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Tasks Section */}
      <section className="rounded-2xl border bg-card p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ListTodo className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold sm:text-xl">
                ขั้นตอนการทำงาน (Tasks)
              </h2>
              <p className="text-xs text-muted-foreground">
                {sortBy === "custom" && filterStatus === "all" ? (
                  <span>
                    สามารถลากสัญลักษณ์ <GripVertical className="inline w-3.5 h-3.5" /> เพื่อเรียงลำดับขั้นตอนได้
                  </span>
                ) : (
                  <span>
                    เรียงตาม:{" "}
                    <strong className="font-semibold text-foreground">
                      {sortBy === "newest" && "งานล่าสุด (ล่าสุดมาก่อน)"}
                      {sortBy === "oldest" && "งานเก่าสุด (เก่าสุดมาก่อน)"}
                      {sortBy === "priority" && "ความสำคัญ (ด่วนมาก่อน)"}
                      {sortBy === "due_date" && "วันครบกำหนด (ใกล้ถึงก่อน)"}
                    </strong>
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy("custom");
                        setFilterStatus("all");
                      }}
                      className="ml-2 text-primary underline hover:text-primary/80"
                    >
                      (สลับไปโหมดลากจัดลำดับ)
                    </button>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border text-xs font-medium overflow-x-auto">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                  filterStatus === "all"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ทั้งหมด ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("todo")}
                className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                  filterStatus === "todo"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                รอทำ ({tasks.filter((t) => t.status === "todo").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("in_progress")}
                className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                  filterStatus === "in_progress"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                กำลังทำ ({tasks.filter((t) => t.status === "in_progress").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("done")}
                className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                  filterStatus === "done"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                เสร็จแล้ว ({tasks.filter((t) => t.status === "done").length})
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-muted transition shadow-sm"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                    <span>
                      เรียงตาม:{" "}
                      {sortBy === "newest" && "งานล่าสุด"}
                      {sortBy === "oldest" && "งานเก่าสุด"}
                      {sortBy === "priority" && "ความสำคัญ"}
                      {sortBy === "due_date" && "วันครบกำหนด"}
                      {sortBy === "custom" && "ตามลำดับขั้นตอน"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                    เรียงลำดับขั้นตอนงาน
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setSortBy("newest")}
                    className="cursor-pointer"
                  >
                    <Clock className="w-4 h-4 mr-2 text-primary" />
                    <span className="flex-1">งานล่าสุด (ค่าเริ่มต้น)</span>
                    {sortBy === "newest" && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy("oldest")}
                    className="cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="flex-1">งานเก่าสุด</span>
                    {sortBy === "oldest" && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy("priority")}
                    className="cursor-pointer"
                  >
                    <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                    <span className="flex-1">ความสำคัญ (ด่วนมาก่อน)</span>
                    {sortBy === "priority" && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy("due_date")}
                    className="cursor-pointer"
                  >
                    <CalendarDays className="w-4 h-4 mr-2 text-amber-500" />
                    <span className="flex-1">วันครบกำหนด (ใกล้ถึงก่อน)</span>
                    {sortBy === "due_date" && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortBy("custom");
                      setFilterStatus("all");
                    }}
                    className="cursor-pointer"
                  >
                    <GripVertical className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="flex-1">ตามลำดับขั้นตอน (ลากจัดเอง)</span>
                    {sortBy === "custom" && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Task Creation Form with Priority & Due Date */}
        <form
          onSubmit={handleCreateTask}
          className="mb-8 p-4 rounded-2xl border bg-muted/20 space-y-3"
        >
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Plus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                name="title"
                required
                disabled={isAddingTask}
                placeholder="เพิ่มขั้นตอนใหม่ของโปรเจกต์..."
                className="h-11 w-full rounded-xl border bg-background pl-10 pr-4 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <div className="flex-1 sm:flex-none">
                <select
                  name="priority"
                  defaultValue="medium"
                  disabled={isAddingTask}
                  className="h-11 w-full rounded-xl border bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                >
                  <option value="low">ความสำคัญ: ทั่วไป</option>
                  <option value="medium">ความสำคัญ: ปานกลาง</option>
                  <option value="high">ความสำคัญ: ด่วนมาก 🔥</option>
                </select>
              </div>

              <div className="flex-1 sm:flex-none">
                <input
                  type="date"
                  name="due_date"
                  disabled={isAddingTask}
                  className="h-11 w-full rounded-xl border bg-background px-3 text-xs text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={isAddingTask}
                className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isAddingTask ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>กำลังเพิ่มงาน...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>เพิ่มงาน</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Tasks List with Drag & Drop */}
        {tasks.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed px-5 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <ListTodo className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">ยังไม่มีขั้นตอนการทำงาน</p>
            <p className="mt-1 text-sm text-muted-foreground">
              เริ่มเพิ่มงานแรกของโปรเจคได้จากแบบฟอร์มด้านบน
            </p>
          </div>
        ) : processedTasks.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed px-5 py-10 text-center">
            <p className="font-medium text-muted-foreground">
              ไม่พบงานที่ตรงกับสถานะที่เลือก
            </p>
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className="mt-2 text-xs text-primary underline hover:text-primary/80"
            >
              แสดงงานทั้งหมด
            </button>
          </div>
        ) : isMounted ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="project-tasks">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-3"
                >
                  {processedTasks.map((task: any, index: number) => {
                    const isDragEnabled =
                      sortBy === "custom" && filterStatus === "all";

                    return (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                        isDragDisabled={!isDragEnabled}
                      >
                        {(dragProvided, snapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={`group rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 ${getTaskStyle(
                              task.status
                            )} ${
                              snapshot.isDragging
                                ? "shadow-lg ring-2 ring-primary/30"
                                : ""
                            }`}
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                              {/* Drag Handle & Index */}
                              <div className="flex min-w-0 flex-1 items-start gap-3">
                                <div
                                  {...(isDragEnabled
                                    ? dragProvided.dragHandleProps
                                    : {})}
                                  className={`pt-2 transition-colors ${
                                    isDragEnabled
                                      ? "text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing"
                                      : "text-muted-foreground/20 cursor-default"
                                  }`}
                                  title={
                                    isDragEnabled
                                      ? "ลากเพื่อเรียงลำดับ"
                                      : "สลับเป็นโหมด 'ตามลำดับขั้นตอน' เพื่อเปิดใช้งานการลากจัดลำดับ"
                                  }
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>

                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-10 sm:w-10 ${
                                    task.status === "done"
                                      ? "bg-emerald-200 text-emerald-800"
                                      : task.status === "in_progress"
                                      ? "bg-blue-200 text-blue-800"
                                      : "bg-primary/10 text-primary"
                                  }`}
                                >
                                  {index + 1}
                                </div>

                                {/* Task Title & Meta Info */}
                                <div className="min-w-0 flex-1 pt-1">
                                  {editingTaskId === task.id ? (
                                    <form
                                      action={(formData) =>
                                        handleUpdateTaskTitle(formData, task.id)
                                      }
                                      className="flex flex-col gap-2 sm:flex-row"
                                    >
                                      <input
                                        type="text"
                                        name="title"
                                        defaultValue={task.title}
                                        autoFocus
                                        required
                                        className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          type="submit"
                                          className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                        >
                                          <Save className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingTaskId(null)}
                                          className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 text-xs font-medium hover:bg-secondary/80"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <div>
                                      <p
                                        className={`break-words text-sm font-semibold leading-relaxed sm:text-base ${
                                          task.status === "done"
                                            ? "text-emerald-700/70 line-through"
                                            : "text-foreground"
                                        }`}
                                      >
                                        {task.title}
                                      </p>

                                      {/* Priority, Due Date & Created Date Badges */}
                                      <div className="flex flex-wrap items-center gap-2 mt-2">
                                        {renderPriorityBadge(task.priority)}
                                        {renderDueDateBadge(
                                          task.due_date,
                                          task.status
                                        )}
                                        {renderCreatedDateBadge(task.created_at)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Status Change Buttons & Actions */}
                              {editingTaskId !== task.id && (
                                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                                  <div className="grid w-full grid-cols-3 gap-1 rounded-xl border bg-muted/40 p-1 lg:w-auto">
                                    <form
                                      action={updateTaskStatus.bind(
                                        null,
                                        task.id,
                                        "todo",
                                        project.id
                                      )}
                                    >
                                      <button
                                        type="submit"
                                        className={`flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition sm:px-3 ${
                                          task.status === "todo"
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                                        }`}
                                      >
                                        <Circle className="h-3.5 w-3.5 shrink-0" />
                                        <span>รอทำ</span>
                                      </button>
                                    </form>

                                    <form
                                      action={updateTaskStatus.bind(
                                        null,
                                        task.id,
                                        "in_progress",
                                        project.id
                                      )}
                                    >
                                      <button
                                        type="submit"
                                        className={`flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition sm:px-3 ${
                                          task.status === "in_progress"
                                            ? "bg-blue-100 text-blue-700 font-semibold"
                                            : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                                        }`}
                                      >
                                        <Timer className="h-3.5 w-3.5 shrink-0" />
                                        <span>กำลังทำ</span>
                                      </button>
                                    </form>

                                    <form
                                      action={updateTaskStatus.bind(
                                        null,
                                        task.id,
                                        "done",
                                        project.id
                                      )}
                                    >
                                      <button
                                        type="submit"
                                        className={`flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition sm:px-3 ${
                                          task.status === "done"
                                            ? "bg-emerald-100 text-emerald-700 font-semibold"
                                            : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                                        }`}
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                        <span>เสร็จ</span>
                                      </button>
                                    </form>
                                  </div>

                                  <div className="flex w-full gap-2 lg:w-auto">
                                    <button
                                      onClick={() => setEditingTaskId(task.id)}
                                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition lg:flex-none"
                                      title="แก้ไขชื่องาน"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>

                                    <button
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-600 hover:bg-red-100 transition lg:flex-none"
                                      title="ลบงาน"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="space-y-3">
            {processedTasks.map((task: any, index: number) => (
              <div
                key={task.id}
                className={`rounded-2xl border p-4 ${getTaskStyle(task.status)}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold">{task.title}</span>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {renderPriorityBadge(task.priority)}
                      {renderDueDateBadge(task.due_date, task.status)}
                      {renderCreatedDateBadge(task.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
