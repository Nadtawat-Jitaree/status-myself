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
import { Button } from "@/components/ui/button";

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
  Loader2,
  CalendarDays,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Check,
  Target,
  Settings2,
  FileText,
  Maximize2,
  Minimize2,
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
  const [isTaskFormExpanded, setIsTaskFormExpanded] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [newTaskQualities, setNewTaskQualities] = useState<SelectedQualityInput[]>([]);
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "priority" | "due_date" | "custom"
  >("newest");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "todo" | "in_progress" | "done"
  >("all");

  // Project Target States (derive progress directly from tasks done)
  const [targetCount, setTargetCount] = useState<number | null>(
    project.target_count ?? null,
  );
  const [targetLabel, setTargetLabel] = useState<string>(
    project.target_label || "คลิป",
  );
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetFormCount, setTargetFormCount] = useState<string>(
    project.target_count ? String(project.target_count) : "",
  );
  const [targetFormLabel, setTargetFormLabel] = useState<string>(
    project.target_label || "คลิป",
  );
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);

  // Selected Task for Detail Modal / Drawer
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isTaskDetailModalExpanded, setIsTaskDetailModalExpanded] =
    useState(false);
  const [modalStatus, setModalStatus] = useState<string>("todo");
  const [selectedQualities, setSelectedQualities] = useState<
    SelectedQualityInput[]
  >([]);
  const [isSavingTaskDetail, setIsSavingTaskDetail] = useState(false);

  // Loading states for Note/Task operations
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState<
    string | null
  >(null);
  const [updatingStatusTarget, setUpdatingStatusTarget] = useState<
    string | null
  >(null);
  const [savingTitleTaskId, setSavingTitleTaskId] = useState<string | null>(
    null,
  );
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);

  const openTaskDetail = (task: any) => {
    setSelectedTask(task);
    setIsTaskDetailModalExpanded(false);
    setModalStatus(task.status || "todo");
    const initialQualities: SelectedQualityInput[] = (task.qualities || []).map(
      (q: any) => ({
        quality_id: q.quality_id,
        level: q.level as 1 | 3 | 5,
      }),
    );
    setSelectedQualities(initialQualities);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setTasks(project.tasks || []);
    setTargetCount(project.target_count ?? null);
    setTargetLabel(project.target_label || "คลิป");
    setTargetFormCount(
      project.target_count ? String(project.target_count) : "",
    );
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
        const diff = (pWeights[b.priority] || 2) - (pWeights[a.priority] || 2);
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
      await createTask(project.id, formData, newTaskQualities);
      form.reset();
      setNewTaskStatus("todo");
      setNewTaskQualities([]);
      setShowAdvancedOptions(false);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "บันทึกข้อมูลเรียบร้อยแล้ว",
        showConfirmButton: false,
        timer: 1500,
      });
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
      setDeletingTaskId(taskId);
      try {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        await deleteTask(taskId, project.id);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "ลบงานเรียบร้อยแล้ว",
          showConfirmButton: false,
          timer: 1500,
        });
      } catch (error) {
        console.error("Failed to delete task:", error);
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถลบงานได้ กรุณาลองใหม่อีกครั้ง",
        });
      } finally {
        setDeletingTaskId(null);
      }
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (updatingStatusTaskId) return;
    const currentTask = tasks.find((t) => t.id === taskId);
    if (!currentTask || currentTask.status === newStatus) return;

    const originalStatus = currentTask.status;
    setUpdatingStatusTaskId(taskId);
    setUpdatingStatusTarget(newStatus);

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );

    try {
      await updateTaskStatus(taskId, newStatus, project.id);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "เปลี่ยนสถานะเรียบร้อย",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: originalStatus } : t,
        ),
      );
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเปลี่ยนสถานะได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setUpdatingStatusTaskId(null);
      setUpdatingStatusTarget(null);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isUpdatingProject) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    setIsUpdatingProject(true);
    try {
      await updateProject(project.id, formData);
      setIsEditing(false);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "บันทึกข้อมูลโปรเจกต์แล้ว",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error) {
      console.error("Failed to update project:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsUpdatingProject(false);
    }
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

  const handleSaveTaskDetailModal = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    if (!selectedTask || isSavingTaskDetail) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const priority = (formData.get("priority") as string) || "medium";
    const dueDateStr = formData.get("due_date") as string;
    const due_date =
      dueDateStr && dueDateStr.trim() !== ""
        ? new Date(dueDateStr).toISOString()
        : null;

    if (!title) return;

    setIsSavingTaskDetail(true);
    try {
      if (modalStatus !== selectedTask.status) {
        await updateTaskStatus(selectedTask.id, modalStatus, project.id);
      }

      await updateTaskDetails(selectedTask.id, project.id, {
        title,
        description,
        priority,
        due_date,
        selectedQualities,
      });

      const updatedQualities = selectedQualities.map((sq) => {
        const qInfo = availableQualities.find(
          (aq: any) => aq.id === sq.quality_id,
        );
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
            ? {
                ...t,
                title,
                description,
                priority,
                due_date,
                status: modalStatus,
                qualities: updatedQualities,
              }
            : t,
        ),
      );

      setSelectedTask(null);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "บันทึกรายละเอียดงานแล้ว",
        timer: 1500,
        showConfirmButton: false,
      });
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
    e: React.FormEvent<HTMLFormElement>,
    taskId: string,
  ) => {
    e.preventDefault();
    if (savingTitleTaskId) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const newTitle = (formData.get("title") as string)?.trim();
    if (!newTitle) return;

    setSavingTitleTaskId(taskId);
    try {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t)),
      );
      await updateTaskTitle(taskId, newTitle, project.id);
      setEditingTaskId(null);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "แก้ไขข้อมูลเรียบร้อย",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error) {
      console.error("Failed to update task title:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถแก้ไขได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setSavingTitleTaskId(null);
    }
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
      })),
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
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
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

  const renderTaskDateBadges = (task: any) => {
    if (!task) return null;
    const isDone = task.status === "done";
    const completedAtStr = task.completed_at || (isDone ? task.updated_at : null);

    const formatShortDate = (dStr?: string) => {
      if (!dStr) return "-";
      const d = new Date(dStr);
      return d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    };

    const formatShortTime = (dStr?: string) => {
      if (!dStr) return "";
      const d = new Date(dStr);
      return d.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    return (
      <div className="inline-flex flex-wrap items-center gap-1.5">
        {task.created_at && (
          <span
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground px-2.5 py-0.5 rounded-full bg-muted/60"
            title={`สร้างเมื่อ: ${new Date(task.created_at).toLocaleString("th-TH")}${task.creator?.full_name ? ` โดย ${task.creator.full_name}` : ""}`}
          >
            <CalendarDays className="w-3 h-3 text-muted-foreground/70" />
            สร้าง: {formatShortDate(task.created_at)}
          </span>
        )}

        {isDone && completedAtStr && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800"
            title={`เสร็จสิ้นเมื่อ: ${new Date(completedAtStr).toLocaleString("th-TH")}`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            เสร็จ: {formatShortDate(completedAtStr)}
          </span>
        )}
      </div>
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
            <form onSubmit={handleUpdateProject} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  ชื่อโปรเจกต์
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={project.name}
                  required
                  disabled={isUpdatingProject}
                  className="h-11 w-full rounded-xl border border-input bg-background px-4 text-base font-semibold outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  รายละเอียด
                </label>
                <textarea
                  name="description"
                  defaultValue={project.description}
                  disabled={isUpdatingProject}
                  className="min-h-[100px] w-full resize-none rounded-xl border border-input bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isUpdatingProject}
                  className="text-white"
                >
                  {isUpdatingProject ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      บันทึก
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  disabled={isUpdatingProject}
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center border bg-background text-sm font-semibold hover:bg-muted disabled:opacity-60 text-black"
                >
                  <X className="h-4 w-4" />
                  ยกเลิก
                </Button>
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
                    className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    แก้ไข
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
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
                    className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-background text-xs font-semibold hover:bg-muted shadow-sm"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>
                      {targetCount ? "ปรับแก้เป้าหมาย" : "ตั้งค่าเป้าหมาย"}
                    </span>
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
                          className="px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          disabled={isUpdatingTarget}
                          className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-1.5"
                        >
                          {isUpdatingTarget && (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          )}
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
                            สร้างงานแล้วทั้งหมด {totalTasks} {targetLabel}{" "}
                            (ทำสำเร็จ {doneTasks} / {targetCount})
                          </span>
                        </p>
                        {doneTasks >= targetCount && (
                          <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                            บรรลุเป้าหมายครบ {targetCount} {targetLabel} แล้ว!
                            🎉
                          </p>
                        )}
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
                            Math.round((doneTasks / targetCount) * 100),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  !isEditingTarget && (
                    <div className="py-2 text-xs text-muted-foreground">
                      โปรเจกต์นี้ยังไม่ได้กำหนดเป้าหมายเชิงจำนวน (สามารถกดปุ่ม{" "}
                      <strong>ตั้งค่าเป้าหมาย</strong> ด้านบนเพื่อเปิดใช้งาน
                      เช่น 100 คลิป)
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
                    สามารถลากสัญลักษณ์{" "}
                    <GripVertical className="inline w-3.5 h-3.5" />{" "}
                    เพื่อเรียงลำดับขั้นตอนได้
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
                className={`px-3 py-1.5 rounded-md shrink-0 ${
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
                className={`px-3 py-1.5 rounded-md shrink-0 ${
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
                className={`px-3 py-1.5 rounded-md shrink-0 ${
                  filterStatus === "in_progress"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                กำลังทำ (
                {tasks.filter((t) => t.status === "in_progress").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("done")}
                className={`px-3 py-1.5 rounded-md shrink-0 ${
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
                    className="inline-flex items-center gap-2 rounded-md border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-muted shadow-sm"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                    <span>
                      เรียงตาม: {sortBy === "newest" && "งานล่าสุด"}
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

        {/* Task Creation Form — Minimal & Easy-use */}
        <div className="mb-8 rounded-2xl border border-primary/20 bg-card shadow-sm overflow-hidden transition-all duration-200">
          {/* Form Header with Collapse Toggle */}
          <div
            onClick={() => setIsTaskFormExpanded(!isTaskFormExpanded)}
            className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/[0.04] to-transparent cursor-pointer select-none hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                เพิ่มงานใหม่
              </span>
              {!isTaskFormExpanded && (
                <span className="text-xs text-muted-foreground ml-1">
                  (คลิกเพื่อเปิดฟอร์ม)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">
                {isTaskFormExpanded
                  ? "กรอกชื่องาน แล้วกด Enter หรือคลิก \"เพิ่มงาน\""
                  : "คลิกเพื่อเพิ่มงาน"}
              </span>
              <button
                type="button"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label={isTaskFormExpanded ? "ซ่อนฟอร์ม" : "เปิดฟอร์ม"}
              >
                {isTaskFormExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Form Body */}
          {isTaskFormExpanded && (
            <form
              onSubmit={handleCreateTask}
              className="p-4 space-y-3.5 border-t border-border/50 animate-in fade-in slide-in-from-top-1 duration-150"
            >
              {/* Title Row */}
              <div className="relative">
                <input
                  type="text"
                  name="title"
                  required
                  disabled={isAddingTask}
                  placeholder="ชื่องาน / ขั้นตอนใหม่..."
                  className="h-11 w-full rounded-xl border border-input bg-background pl-4 pr-4 text-sm font-medium placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60 transition-all"
                />
              </div>

              {/* Controls Row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Selector */}
                <div className="flex items-center gap-1 p-1 rounded-xl border bg-background/80 shadow-sm">
                  <span className="text-[11px] text-muted-foreground font-medium pl-2 pr-1 shrink-0">
                    สถานะ:
                  </span>
                  {(
                    [
                      {
                        value: "todo",
                        label: "รอทำ",
                        icon: <Circle className="w-3 h-3" />,
                      },
                      {
                        value: "in_progress",
                        label: "กำลังทำ",
                        icon: <Timer className="w-3 h-3" />,
                      },
                      {
                        value: "done",
                        label: "เสร็จแล้ว",
                        icon: <CheckCircle2 className="w-3 h-3" />,
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isAddingTask}
                      onClick={() => setNewTaskStatus(opt.value)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all select-none disabled:opacity-60 ${
                        newTaskStatus === opt.value
                          ? opt.value === "done"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : opt.value === "in_progress"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                              : "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                  {/* Hidden input to carry value in form */}
                  <input type="hidden" name="status" value={newTaskStatus} />
                </div>

                {/* Priority Selector */}
                <select
                  name="priority"
                  defaultValue="medium"
                  disabled={isAddingTask}
                  className="h-9 rounded-xl border bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 text-muted-foreground"
                >
                  <option value="low">🔵 ทั่วไป</option>
                  <option value="medium">🟡 ปานกลาง</option>
                  <option value="high">🔴 ด่วนมาก</option>
                </select>

                {/* Due Date */}
                <input
                  type="date"
                  name="due_date"
                  disabled={isAddingTask}
                  className="h-9 rounded-xl border bg-background px-3 text-xs text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />

                {/* Collapsible Toggle for Details & Qualities */}
                <button
                  type="button"
                  disabled={isAddingTask}
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    showAdvancedOptions || newTaskQualities.length > 0
                      ? "bg-primary/10 border-primary/30 text-primary shadow-xs"
                      : "bg-background border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                  title={
                    showAdvancedOptions
                      ? "ซ่อนคุณสมบัติและบันทึก"
                      : "เปิดกำหนดคุณสมบัติและบันทึก"
                  }
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>คุณสมบัติ & โน้ต</span>
                  {newTaskQualities.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                      +{newTaskQualities.length}
                    </span>
                  )}
                  {showAdvancedOptions ? (
                    <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                  )}
                </button>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isAddingTask}
                  className="text-white ml-auto"
                >
                  {isAddingTask ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังเพิ่ม...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>เพิ่มงาน</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Advanced Options Section (Description + Quality Picker) */}
              {showAdvancedOptions && (
                <div className="space-y-3 pt-2 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Description */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground/70" />
                      รายละเอียดเพิ่มเติม / โน้ต (ไม่บังคับ)
                    </label>
                    <textarea
                      name="description"
                      disabled={isAddingTask}
                      rows={2}
                      placeholder="เขียนรายละเอียด ขั้นตอนย่อย ลิงก์อ้างอิง หรือบันทึกสำคัญ..."
                      className="w-full rounded-xl border bg-background/70 p-3 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-background disabled:opacity-60 resize-none transition-all"
                    />
                  </div>

                  {/* Quality Picker */}
                  {availableQualities.length > 0 && (
                    <QualityPicker
                      qualities={availableQualities}
                      value={newTaskQualities}
                      onChange={setNewTaskQualities}
                      label="คุณสมบัติที่จะได้รับจากงานนี้"
                      sublabel="ติ๊กเพื่อรับแต้มเมื่อทำสถานะสำเร็จ"
                      isLoading={isAddingTask}
                    />
                  )}
                </div>
              )}
            </form>
          )}
        </div>

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
                  {/* Creating Note/Task Loading State Card */}
                  {isAddingTask && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl border border-primary/30 bg-primary/5 animate-pulse shadow-xs">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold text-primary">
                          กำลังบันทึกข้อมูลงาน / โน้ตใหม่...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          กรุณารอสักครู่ ระบบกำลังบันทึกข้อมูล
                        </p>
                      </div>
                    </div>
                  )}

                  {processedTasks.map((task: any, index: number) => {
                    const isDragEnabled =
                      sortBy === "custom" && filterStatus === "all";
                    const isStatusUpdating = updatingStatusTaskId === task.id;
                    const isTitleSaving = savingTitleTaskId === task.id;
                    const isDeleting = deletingTaskId === task.id;

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
                              task.status,
                            )} ${
                              snapshot.isDragging
                                ? "shadow-lg ring-2 ring-primary/30"
                                : ""
                            } ${isStatusUpdating ? "ring-2 ring-primary/40" : ""}`}
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
                                  {isStatusUpdating ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-current" />
                                  ) : (
                                    index + 1
                                  )}
                                </div>

                                {/* Task Title & Meta Info */}
                                <div className="min-w-0 flex-1 pt-1">
                                  {editingTaskId === task.id ? (
                                    <form
                                      onSubmit={(e) =>
                                        handleUpdateTaskTitle(e, task.id)
                                      }
                                      className="flex flex-col gap-2 sm:flex-row"
                                    >
                                      <input
                                        type="text"
                                        name="title"
                                        defaultValue={task.title}
                                        autoFocus
                                        required
                                        disabled={isTitleSaving}
                                        className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          type="submit"
                                          disabled={isTitleSaving}
                                          className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                                          title="บันทึกการแก้ไข"
                                        >
                                          {isTitleSaving ? (
                                            <>
                                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                              <span className="hidden sm:inline">
                                                กำลังบันทึก...
                                              </span>
                                            </>
                                          ) : (
                                            <Save className="h-3.5 w-3.5" />
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isTitleSaving}
                                          onClick={() => setEditingTaskId(null)}
                                          className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-secondary px-3 text-xs font-medium hover:bg-secondary/80 disabled:opacity-60"
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
                                          task.status,
                                        )}
                                        {renderTaskDateBadges(task)}
                                        <button
                                          type="button"
                                          onClick={() => openTaskDetail(task)}
                                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors border border-primary/20"
                                        >
                                          <FileText className="w-3 h-3" />
                                          <span>
                                            {task.description
                                              ? "รายละเอียด & โน้ต"
                                              : "+ รายละเอียด"}
                                          </span>
                                        </button>
                                      </div>

                                      {/* Quality Badges */}
                                      {task.qualities &&
                                        task.qualities.length > 0 && (
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
                                                <span className="truncate max-w-[120px]">
                                                  {q.name}
                                                </span>
                                                <span className="font-bold text-[10px] opacity-90">
                                                  +{q.level}
                                                </span>
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
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStatusChange(task.id, "todo")
                                      }
                                      disabled={isStatusUpdating}
                                      className={`flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium sm:px-3 transition-colors ${
                                        task.status === "todo"
                                          ? "bg-background text-foreground shadow-sm"
                                          : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                                      } ${isStatusUpdating ? "opacity-70 cursor-not-allowed" : ""}`}
                                    >
                                      {isStatusUpdating &&
                                      updatingStatusTarget === "todo" ? (
                                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                                      ) : (
                                        <Circle className="h-3.5 w-3.5 shrink-0" />
                                      )}
                                      <span>
                                        {isStatusUpdating &&
                                        updatingStatusTarget === "todo"
                                          ? "กำลังเปลี่ยน..."
                                          : "รอทำ"}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStatusChange(
                                          task.id,
                                          "in_progress",
                                        )
                                      }
                                      disabled={isStatusUpdating}
                                      className={`flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium sm:px-3 transition-colors ${
                                        task.status === "in_progress"
                                          ? "bg-blue-100 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300"
                                          : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                                      } ${isStatusUpdating ? "opacity-70 cursor-not-allowed" : ""}`}
                                    >
                                      {isStatusUpdating &&
                                      updatingStatusTarget === "in_progress" ? (
                                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-600" />
                                      ) : (
                                        <Timer className="h-3.5 w-3.5 shrink-0" />
                                      )}
                                      <span>
                                        {isStatusUpdating &&
                                        updatingStatusTarget === "in_progress"
                                          ? "กำลังเปลี่ยน..."
                                          : "กำลังทำ"}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStatusChange(task.id, "done")
                                      }
                                      disabled={isStatusUpdating}
                                      className={`flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium sm:px-3 transition-colors ${
                                        task.status === "done"
                                          ? "bg-emerald-100 text-emerald-700 font-semibold dark:bg-emerald-950/60 dark:text-emerald-300"
                                          : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                                      } ${isStatusUpdating ? "opacity-70 cursor-not-allowed" : ""}`}
                                    >
                                      {isStatusUpdating &&
                                      updatingStatusTarget === "done" ? (
                                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-emerald-600" />
                                      ) : (
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                      )}
                                      <span>
                                        {isStatusUpdating &&
                                        updatingStatusTarget === "done"
                                          ? "กำลังเปลี่ยน..."
                                          : "เสร็จ"}
                                      </span>
                                    </button>
                                  </div>

                                  <div className="flex w-full gap-1.5 lg:w-auto items-center">
                                    <button
                                      type="button"
                                      disabled={isStatusUpdating}
                                      onClick={() => openTaskDetail(task)}
                                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-primary/25 bg-primary/5 px-3 text-xs font-semibold text-primary hover:bg-primary/10 hover:border-primary/40 transition-all shadow-2xs lg:flex-none disabled:opacity-50"
                                      title="แก้ไขรายละเอียดและคุณสมบัติงาน"
                                    >
                                      <Pencil className="h-3.5 w-3.5 shrink-0" />
                                      <span>แก้ไข</span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={isDeleting || isStatusUpdating}
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-red-200 bg-red-50 text-xs font-medium text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors disabled:opacity-50"
                                      title="ลบงาน"
                                    >
                                      {isDeleting ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}
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
                      {renderTaskDateBadges(task)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Task Detail Modal */}
      {selectedTask &&
        isMounted &&
        createPortal(
          <div
            className={`fixed inset-0 top-0 left-0 right-0 bottom-0 z-[100] !m-0 flex items-center justify-center ${
              isTaskDetailModalExpanded ? "p-0" : "p-3 sm:p-6"
            } bg-black/70 animate-in fade-in duration-150`}
            onClick={() => setSelectedTask(null)}
          >
            <div
              className={`relative flex flex-col overflow-hidden border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-150 ${
                isTaskDetailModalExpanded
                  ? "h-[100dvh] w-screen max-h-none max-w-none rounded-none"
                  : "w-full max-w-lg max-h-[90vh] rounded-2xl sm:max-w-xl sm:rounded-3xl"
              }`}
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
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setIsTaskDetailModalExpanded((expanded) => !expanded)
                    }
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title={
                      isTaskDetailModalExpanded ? "ย่อหน้าต่าง" : "ขยายเต็มจอ"
                    }
                    aria-label={
                      isTaskDetailModalExpanded ? "ย่อหน้าต่าง" : "ขยายเต็มจอ"
                    }
                  >
                    {isTaskDetailModalExpanded ? (
                      <Minimize2 className="w-5 h-5" />
                    ) : (
                      <Maximize2 className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    disabled={isSavingTaskDetail}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                    title="ปิด"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {isSavingTaskDetail && (
                <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-center gap-2 text-xs text-primary font-medium animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังบันทึกข้อมูลและอัปเดตสถานะ...</span>
                </div>
              )}

              {/* Modal Form */}
              <form
                onSubmit={handleSaveTaskDetailModal}
                className="flex flex-col flex-1 overflow-hidden min-h-0"
              >
                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                      ชื่องาน / หัวข้อ{" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      defaultValue={selectedTask.title}
                      required
                      disabled={isSavingTaskDetail}
                      className="w-full h-10 rounded-xl border bg-background px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
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
                      className="w-full rounded-xl border bg-background p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">
                        สถานะ
                      </label>
                      <select
                        value={modalStatus}
                        onChange={(e) => setModalStatus(e.target.value)}
                        disabled={isSavingTaskDetail}
                        className="w-full h-10 rounded-xl border bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                      >
                        <option value="todo">รอทำ</option>
                        <option value="in_progress">กำลังทำ</option>
                        <option value="done">เสร็จสิ้น</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">
                        ความสำคัญ
                      </label>
                      <select
                        name="priority"
                        defaultValue={selectedTask.priority || "medium"}
                        disabled={isSavingTaskDetail}
                        className="w-full h-10 rounded-xl border bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                      >
                        <option value="low">ทั่วไป</option>
                        <option value="medium">ปานกลาง</option>
                        <option value="high">ด่วนมาก</option>
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
                            ? new Date(selectedTask.due_date)
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        disabled={isSavingTaskDetail}
                        className="w-full h-10 rounded-xl border bg-background px-3 text-xs text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border p-4 sm:p-5 bg-card shrink-0">
                  <div className="flex flex-col gap-1 text-[11px] text-muted-foreground min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        สร้างเมื่อ:{" "}
                        <strong className="font-medium text-foreground">
                          {selectedTask.created_at
                            ? new Date(selectedTask.created_at).toLocaleString("th-TH", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }) + " น."
                            : "-"}
                        </strong>
                        {selectedTask.creator?.full_name && (
                          <span className="text-muted-foreground ml-1">
                            โดย {selectedTask.creator.full_name}
                          </span>
                        )}
                      </span>

                      {/* แสดง updated_by และ updated_at ใน Modal ตาม Requirement */}
                      {(selectedTask.updated_at || selectedTask.updater) && (
                        <span className="inline-flex items-center gap-1.5 border-l border-border/70 pl-3">
                          <Pencil className="w-3 h-3 text-muted-foreground/70" />
                          แก้ไขล่าสุด:{" "}
                          {selectedTask.updater?.avatar_url ? (
                            <img
                              src={selectedTask.updater.avatar_url}
                              alt={selectedTask.updater.full_name || "User"}
                              className="w-4 h-4 rounded-full object-cover inline border border-border"
                            />
                          ) : null}
                          <strong className="font-medium text-foreground">
                            {selectedTask.updater?.full_name || "ผู้ใช้งาน"}
                          </strong>
                          {selectedTask.updated_at && (
                            <span>
                              (
                              {new Date(selectedTask.updated_at).toLocaleString("th-TH", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              น.)
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* แสดง completed_at เมื่อสถานะเป็น done */}
                    {(selectedTask.status === "done" || modalStatus === "done") && (
                      <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          เสร็จสิ้นสมบูรณ์เมื่อ:{" "}
                          {selectedTask.completed_at
                            ? new Date(selectedTask.completed_at).toLocaleString("th-TH", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }) + " น."
                            : "งานนี้อยู่ในสถานะเสร็จสิ้น"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setSelectedTask(null)}
                      disabled={isSavingTaskDetail}
                      className="px-4 py-2 rounded-md border bg-background text-xs font-medium hover:bg-muted transition-colors"
                    >
                      ปิด
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingTaskDetail}
                      className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-1.5 shadow-sm transition-colors"
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
          document.body,
        )}
    </div>
  );
}
