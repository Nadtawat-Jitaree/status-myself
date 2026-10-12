"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

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
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800">
            ด่วนมาก
          </span>
        );
      case "low":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            ทั่วไป
          </span>
        );
      case "medium":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
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
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 animate-pulse">
          <AlertCircle className="w-3 h-3" />
          เลยกำหนด: {dueDate.toLocaleDateString("th-TH")}
        </span>
      );
    }

    if (isDueSoon) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
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

  const getTaskStyle = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-blue-50/60 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900";
      case "done":
        return "bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900 opacity-90";
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
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 transition"
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
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ListTodo className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold sm:text-xl">
                ขั้นตอนการทำงาน (Tasks)
              </h2>
              <p className="text-xs text-muted-foreground">
                สามารถลากสัญลักษณ์ <GripVertical className="inline w-3.5 h-3.5" /> เพื่อเรียงลำดับขั้นตอนได้
              </p>
            </div>
          </div>
        </div>

        {/* Task Creation Form with Priority & Due Date */}
        <form
          action={createTask.bind(null, project.id)}
          className="mb-8 p-4 rounded-2xl border bg-muted/20 space-y-3"
        >
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Plus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                name="title"
                required
                placeholder="เพิ่มขั้นตอนใหม่ของโปรเจกต์..."
                className="h-11 w-full rounded-xl border bg-background pl-10 pr-4 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <div className="flex-1 sm:flex-none">
                <select
                  name="priority"
                  defaultValue="medium"
                  className="h-11 w-full rounded-xl border bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
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
                  className="h-11 w-full rounded-xl border bg-background px-3 text-xs text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                type="submit"
                className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                เพิ่มงาน
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
        ) : isMounted ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="project-tasks">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-3"
                >
                  {tasks.map((task: any, index: number) => (
                    <Draggable
                      key={task.id}
                      draggableId={task.id}
                      index={index}
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
                                {...dragProvided.dragHandleProps}
                                className="pt-2 text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
                                title="ลากเพื่อเรียงลำดับ"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>

                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-10 sm:w-10 ${
                                  task.status === "done"
                                    ? "bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : task.status === "in_progress"
                                    ? "bg-blue-200 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
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
                                          ? "text-emerald-700/70 dark:text-emerald-400/60 line-through"
                                          : "text-foreground"
                                      }`}
                                    >
                                      {task.title}
                                    </p>

                                    {/* Priority & Due Date Badges */}
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                      {renderPriorityBadge(task.priority)}
                                      {renderDueDateBadge(
                                        task.due_date,
                                        task.status
                                      )}
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
                                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold"
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
                                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold"
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
                                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 px-3 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 transition lg:flex-none"
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
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="space-y-3">
            {tasks.map((task: any, index: number) => (
              <div
                key={task.id}
                className={`rounded-2xl border p-4 ${getTaskStyle(task.status)}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs">
                    {index + 1}
                  </div>
                  <span className="font-semibold">{task.title}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
