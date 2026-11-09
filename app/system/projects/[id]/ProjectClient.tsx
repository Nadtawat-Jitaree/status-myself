"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  updateProject,
  deleteProject,
  updateTaskStatus,
  createTask,
  deleteTask,
  updateTaskTitle,
  updateTaskDetails,
  reorderTasks,
  updateProjectTarget,
} from "@/app/actions/projects";
import { QualityPicker } from "@/components/QualityPicker";
import { QualityIconRenderer } from "@/lib/lucide-icons";
import { SelectedQualityInput } from "@/app/actions/qualities";

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
  Target,
  Settings2,
  FileText,
  AlignLeft,
  ChevronRight,
  Sparkles,
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

export default function ProjectClient({
  project,
  availableQualities = [],
}: {
  project: any;
  availableQualities?: any[];
}) {
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

  // Project Target States (derive progress directly from tasks done)
  const [targetCount, setTargetCount] = useState<number | null>(
    project.target_count ?? null
  );
  const [targetLabel, setTargetLabel] = useState<string>(
    project.target_label || "คลิป"
  );
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetFormCount, setTargetFormCount] = useState<string>(
    project.target_count ? String(project.target_count) : ""
  );
  const [targetFormLabel, setTargetFormLabel] = useState<string>(
    project.target_label || "คลิป"
  );
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);

  // Selected Task for Detail Modal / Drawer
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedQualities, setSelectedQualities] = useState<SelectedQualityInput[]>([]);
  const [isSavingTaskDetail, setIsSavingTaskDetail] = useState(false);

  const openTaskDetail = (task: any) => {
    setSelectedTask(task);
    const initialQualities: SelectedQualityInput[] = (task.qualities || []).map((q: any) => ({
      quality_id: q.quality_id,
      level: q.level as 1 | 3 | 5,
    }));
    setSelectedQualities(initialQualities);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setTasks(project.tasks || []);
    setTargetCount(project.target_count ?? null);
    setTargetLabel(project.target_label || "คลิป");
    setTargetFormCount(project.target_count ? String(project.target_count) : "");
    setTargetFormLabel(project.target_label || "คลิป");
  }, [project.tasks, project.target_count, project.target_label]);

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
      title: "ต้องการลบโปรเจกต์นี้?",
      text: "งานย่อยทั้งหมดในโปรเจกต์นี้จะถูกลบไปด้วย และไม่สามารถกู้คืนได้!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, ลบโปรเจกต์",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      await deleteProject(project.id);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const result = await Swal.fire({
      title: "ลบงานนี้?",
      text: "งานนี้จะถูกลบออกจากโปรเจกต์",
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

  const handleSaveTargetSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const countNum = targetFormCount.trim() ? Number(targetFormCount) : null;
    if (countNum !== null && (isNaN(countNum) || countNum <= 0)) {
      Swal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ถูกต้อง",
        text: "จำนวนเป้าหมายต้องเป็นตัวเลขที่มากกว่า 0",
      });
      return;
    }

    setIsUpdatingTarget(true);
    try {
      await updateProjectTarget(project.id, {
        target_count: countNum,
        target_label: targetFormLabel.trim() || "คลิป",
      });
      setTargetCount(countNum);
      setTargetLabel(targetFormLabel.trim() || "คลิป");
      setIsEditingTarget(false);
      Swal.fire({
        icon: "success",
        title: countNum ? "บันทึกเป้าหมายสำเร็จ" : "ลบเป้าหมายสำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Failed to update target:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถบันทึกเป้าหมายได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  const handleSaveTaskDetailModal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTask || isSavingTaskDetail) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const priority = (formData.get("priority") as string) || "medium";
    const dueDateStr = formData.get("due_date") as string;
    const due_date = dueDateStr && dueDateStr.trim() !== "" ? new Date(dueDateStr).toISOString() : null;

    if (!title) return;

    setIsSavingTaskDetail(true);
    try {
      await updateTaskDetails(selectedTask.id, project.id, {
        title,
        description,
        priority,
        due_date,
        selectedQualities,
      });

      const updatedQualities = selectedQualities.map((sq) => {
        const qInfo = availableQualities.find((aq: any) => aq.id === sq.quality_id);
        return {
          quality_id: sq.quality_id,
          level: sq.level,
          name: qInfo?.name || "คุณสมบัติ",
          icon: qInfo?.icon || "Star",
          color: qInfo?.color || "#6366f1",
        };
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id
            ? { ...t, title, description, priority, due_date, qualities: updatedQualities }
            : t
        )
      );

      setSelectedTask((prev: any) =>
        prev ? { ...prev, title, description, priority, due_date, qualities: updatedQualities } : null
      );

      Swal.fire({
        icon: "success",
        title: "บันทึกรายละเอียดงานแล้ว",
        timer: 1200,
        showConfirmButton: false,
      });
      setSelectedTask(null);
    } catch (error) {
      console.error("Failed to update task details:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถบันทึกรายละเอียดงานได้",
      });
    } finally {
      setIsSavingTaskDetail(false);
    }
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
            className="h-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {isEditing ? (
            <form action={handleUpdateProject} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  ชื่อโปรเจกต์
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={project.name}
                  required
                  className="h-11 w-full rounded-xl border border-input bg-background px-4 text-base font-semibold outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  รายละเอียด
                </label>
                <textarea
                  name="description"
                  defaultValue={project.description}
                  className="min-h-[100px] w-full resize-none rounded-xl border border-input bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Save className="h-4 w-4" />
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-muted"
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
                    className="inline-flex items-center gap-1.5 rounded-xl border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    แก้ไข
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    ลบโปรเจกต์
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
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Tracker Section (Optional per project) */}
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        เป้าหมายเชิงจำนวน (Target Tracker)
                        {targetCount ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            เปิดใช้งาน
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            ไม่ได้ตั้งเป้าหมาย
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {targetCount
                          ? `ติดตามจำนวนความสำเร็จเป้าหมาย เช่น ทำคลิป, บทความ`
                          : `สามารถกำหนดเป้าหมายเชิงปริมาณสำหรับโปรเจกต์นี้ได้`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingTarget(!isEditingTarget)}
                    className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-background text-xs font-semibold hover:bg-muted shadow-sm"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{targetCount ? "ปรับแก้เป้าหมาย" : "ตั้งค่าเป้าหมาย"}</span>
                  </button>
                </div>

                {/* Edit Target Form Modal/Collapse */}
                {isEditingTarget && (
                  <form
                    onSubmit={handleSaveTargetSettings}
                    className="mb-4 p-4 rounded-xl border bg-card space-y-3 animate-in fade-in duration-150"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                          จำนวนเป้าหมายรวม (เว้นว่างหากต้องการปิดการใช้งาน)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={targetFormCount}
                          onChange={(e) => setTargetFormCount(e.target.value)}
                          placeholder="เช่น 100"
                          className="w-full h-9 rounded-lg border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                          หน่วย / สิ่งที่นับ
                        </label>
                        <input
                          type="text"
                          value={targetFormLabel}
                          onChange={(e) => setTargetFormLabel(e.target.value)}
                          placeholder="เช่น คลิป, ตอน, บทความ"
                          className="w-full h-9 rounded-lg border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {targetCount && (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetFormCount("");
                          }}
                          className="text-xs text-destructive hover:underline"
                        >
                          ล้างค่าเพื่อปิดใช้งาน Target
                        </button>
                      )}
                      <div className="flex gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => setIsEditingTarget(false)}
                          className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          disabled={isUpdatingTarget}
                          className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-1.5"
                        >
                          {isUpdatingTarget && <Loader2 className="w-3 h-3 animate-spin" />}
                          บันทึกเป้าหมาย
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Target Progress Display - Derived directly from completed tasks */}
                {targetCount && targetCount > 0 ? (
                  <div className="space-y-4 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                            {doneTasks}
                          </span>
                          <span className="text-lg sm:text-xl font-bold text-muted-foreground">
                            / {targetCount} {targetLabel}
                          </span>
                          <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            {Math.round((doneTasks / targetCount) * 100)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                          <span>
                            สร้างงานแล้วทั้งหมด {totalTasks} {targetLabel} (ทำสำเร็จ {doneTasks} / {targetCount})
                          </span>
                        </p>
                        {doneTasks >= targetCount && (
                          <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> บรรลุเป้าหมายครบ {targetCount} {targetLabel} แล้ว! 🎉
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div className="text-xs text-muted-foreground bg-background px-3 py-1.5 rounded-xl border">
                          ⚡ อัปเดตอัตโนมัติตามสถานะงานเสร็จ
                        </div>
                      </div>
                    </div>

                    {/* Target Progress Bar */}
                    <div className="h-3 w-full overflow-hidden rounded-full bg-secondary/80">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          doneTasks >= targetCount
                            ? "bg-emerald-500"
                            : "bg-gradient-to-r from-primary to-indigo-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((doneTasks / targetCount) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  !isEditingTarget && (
                    <div className="py-2 text-xs text-muted-foreground">
                      โปรเจกต์นี้ยังไม่ได้กำหนดเป้าหมายเชิงจำนวน (สามารถกดปุ่ม <strong>ตั้งค่าเป้าหมาย</strong> ด้านบนเพื่อเปิดใช้งาน เช่น 100 คลิป)
                    </div>
                  )
                )}
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
                className={`px-3 py-1.5 rounded-lg shrink-0 ${
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
                className={`px-3 py-1.5 rounded-lg shrink-0 ${
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
                className={`px-3 py-1.5 rounded-lg shrink-0 ${
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
                className={`px-3 py-1.5 rounded-lg shrink-0 ${
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
                    className="inline-flex items-center gap-2 rounded-xl border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-muted shadow-sm"
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
                placeholder="เพิ่มขั้นตอนใหม่ / รายการเป้าหมาย..."
                className="h-11 w-full rounded-xl border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
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
                className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed"
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

          <div>
            <textarea
              name="description"
              disabled={isAddingTask}
              rows={2}
              placeholder="เพิ่มรายละเอียด/โน้ตของงานนี้ (ไม่บังคับ - สามารถเปิดอ่านและแก้ไขได้ตลอดเวลา)..."
              className="w-full rounded-xl border bg-background p-3 text-xs outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 disabled:opacity-60 resize-none"
            />
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
              เริ่มเพิ่มงานแรกของโปรเจกต์ได้จากแบบฟอร์มด้านบน
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
                            className={`group rounded-2xl border p-3.5 sm:p-4 ${getTaskStyle(
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
                                  className={`pt-2 ${
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
                                    <div className="space-y-1.5">
                                      <p
                                        className={`break-words text-sm font-semibold leading-relaxed sm:text-base cursor-pointer hover:text-primary transition-colors ${
                                          task.status === "done"
                                            ? "text-emerald-700/70 line-through"
                                            : "text-foreground"
                                        }`}
                                        onClick={() => openTaskDetail(task)}
                                        title="คลิกเพื่อเปิดดูรายละเอียดและแก้ไข"
                                      >
                                        {task.title}
                                      </p>

                                      {/* Task Description Preview */}
                                      {task.description && (
                                        <p
                                          onClick={() => openTaskDetail(task)}
                                          className="text-xs text-muted-foreground line-clamp-2 cursor-pointer hover:text-foreground bg-muted/30 hover:bg-muted/50 p-2 rounded-lg border border-border/50 transition-colors"
                                          title="คลิกเพื่อเปิดดูรายละเอียดฉบับเต็ม"
                                        >
                                          {task.description}
                                        </p>
                                      )}

                                      {/* Priority, Due Date & Created Date Badges */}
                                      <div className="flex flex-wrap items-center gap-2 pt-1">
                                        {renderPriorityBadge(task.priority)}
                                        {renderDueDateBadge(
                                           task.due_date,
                                           task.status
                                         )}
                                        {renderCreatedDateBadge(task.created_at)}
                                        <button
                                          type="button"
                                          onClick={() => openTaskDetail(task)}
                                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors border border-primary/20"
                                        >
                                          <FileText className="w-3 h-3" />
                                          <span>
                                            {task.description ? "รายละเอียด & โน้ต" : "+ รายละเอียด"}
                                          </span>
                                        </button>
                                      </div>

                                      {/* Quality Badges */}
                                      {task.qualities && task.qualities.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                          {task.qualities.map((q: any) => (
                                            <span
                                              key={q.quality_id}
                                              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border"
                                              style={{
                                                borderColor: `${q.color || "#6366f1"}40`,
                                                backgroundColor: `${q.color || "#6366f1"}15`,
                                                color: q.color || "#6366f1",
                                              }}
                                              title={`${q.name} (+${q.level})`}
                                            >
                                              <QualityIconRenderer
                                                iconName={q.icon || "Star"}
                                                className="w-3 h-3 flex-shrink-0"
                                              />
                                              <span className="truncate max-w-[120px]">{q.name}</span>
                                              <span className="font-bold text-[10px] opacity-90">+{q.level}</span>
                                            </span>
                                          ))}
                                        </div>
                                      )}
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
                                        className={`flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium sm:px-3 ${
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
                                        className={`flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium sm:px-3 ${
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
                                        className={`flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium sm:px-3 ${
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

                                  <div className="flex w-full gap-1.5 lg:w-auto items-center">
                                    <button
                                      type="button"
                                      onClick={() => openTaskDetail(task)}
                                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/25 bg-primary/5 px-3 text-xs font-semibold text-primary hover:bg-primary/10 hover:border-primary/40 transition-all shadow-2xs lg:flex-none"
                                      title="แก้ไขรายละเอียดและคุณสมบัติงาน"
                                    >
                                      <Pencil className="h-3.5 w-3.5 shrink-0" />
                                      <span>แก้ไข</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-xs font-medium text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors"
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
    
      {/* Task Detail Modal */}
      {selectedTask && isMounted && createPortal(
        <div
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[100] !m-0 flex items-center justify-center p-3 sm:p-6 bg-black/70 animate-in fade-in duration-150"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="relative w-full max-w-lg sm:max-w-xl max-h-[90vh] rounded-2xl sm:rounded-3xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border p-4 sm:p-5 bg-card shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    รายละเอียดงาน (Task Details)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    ดูและแก้ไขข้อมูลรายละเอียดขั้นตอนงาน และคุณสมบัติ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTaskDetailModal} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    ชื่องาน / หัวข้อ <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={selectedTask.title}
                    required
                    disabled={isSavingTaskDetail}
                    className="w-full h-10 rounded-xl border bg-background px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    รายละเอียดเชิงลึก / บันทึก (Notes)
                  </label>
                  <textarea
                    name="description"
                    defaultValue={selectedTask.description || ""}
                    rows={4}
                    disabled={isSavingTaskDetail}
                    placeholder="เขียนสรุป ข้อมูลอ้างอิง ลิงก์ สิ่งที่ต้องระวัง หรือขั้นตอนย่อย..."
                    className="w-full rounded-xl border bg-background p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                      ความสำคัญ
                    </label>
                    <select
                      name="priority"
                      defaultValue={selectedTask.priority || "medium"}
                      disabled={isSavingTaskDetail}
                      className="w-full h-10 rounded-xl border bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="low">ทั่วไป</option>
                      <option value="medium">ปานกลาง</option>
                      <option value="high">ด่วนมาก 🔥</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                      วันครบกำหนด
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      defaultValue={
                        selectedTask.due_date
                          ? new Date(selectedTask.due_date).toISOString().split("T")[0]
                          : ""
                      }
                      disabled={isSavingTaskDetail}
                      className="w-full h-10 rounded-xl border bg-background px-3 text-xs text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Quality Picker */}
                {availableQualities.length > 0 && (
                  <div>
                    <QualityPicker
                      qualities={availableQualities}
                      value={selectedQualities}
                      onChange={setSelectedQualities}
                      label="คุณสมบัติที่จะได้รับจากงานนี้"
                      sublabel="ติ๊กเพื่อรับแต้มเมื่อทำสถานะสำเร็จ"
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer (Sticky at bottom) */}
              <div className="flex items-center justify-between gap-3 border-t border-border p-4 sm:p-5 bg-card shrink-0">
                <span className="text-[11px] text-muted-foreground truncate">
                  สร้างเมื่อ: {selectedTask.created_at ? new Date(selectedTask.created_at).toLocaleDateString("th-TH") : "-"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    disabled={isSavingTaskDetail}
                    className="px-4 py-2 rounded-xl border bg-background text-xs font-medium hover:bg-muted transition-colors"
                  >
                    ปิด
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingTaskDetail}
                    className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    {isSavingTaskDetail ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>บันทึกการเปลี่ยนแปลง</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
