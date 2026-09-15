
"use client";

import { useState } from "react";
import {
  updateProject,
  deleteProject,
  updateTaskStatus,
  createTask,
  deleteTask,
  updateTaskTitle,
} from "@/app/actions/projects";

import {
  CheckCircle2,
  Circle,
  ListTodo,
  Plus,
  Timer,
  Pencil,
  Trash2,
  ArrowDown,
  Save,
  X,
} from "lucide-react";

import Swal from "sweetalert2";

export default function ProjectClient({ project }: { project: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const totalTasks = project.tasks?.length || 0;

  const doneTasks =
    project.tasks?.filter((t: any) => t.status === "done").length || 0;

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
      await updateTaskTitle(taskId, newTitle, project.id);
    }

    setEditingTaskId(null);
  };

  const getTaskStyle = (status: string) => {
    switch (status) {
      case "in_progress":
        return `
          bg-blue-50/70
          border-blue-200
        `;

      case "done":
        return `
          bg-emerald-50/70
          border-emerald-200
          opacity-90
        `;

      default:
        return `
          bg-background
          border-border
          hover:border-primary/30
        `;
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <section className="group relative overflow-hidden rounded-2xl border bg-card">
        <div className="absolute inset-x-0 top-0 h-1 bg-secondary">
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
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border border-input
                    bg-background
                    px-4
                    text-base
                    font-semibold
                    outline-none
                    transition
                    focus:ring-2
                    focus:ring-primary/30
                  "
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  รายละเอียด
                </label>

                <textarea
                  name="description"
                  defaultValue={project.description}
                  className="
                    min-h-[100px]
                    w-full
                    resize-none
                    rounded-xl
                    border border-input
                    bg-background
                    p-4
                    text-sm
                    outline-none
                    transition
                    focus:ring-2
                    focus:ring-primary/30
                  "
                />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="
                    flex
                    h-10
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    bg-secondary
                    px-4
                    text-sm
                    font-medium
                    transition
                    hover:bg-secondary/80
                    sm:w-auto
                  "
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  className="
                    flex
                    h-10
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    bg-primary
                    px-5
                    text-sm
                    font-medium
                    text-primary-foreground
                    transition
                    hover:bg-primary/90
                    sm:w-auto
                  "
                >
                  บันทึก
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      PROJECT
                    </span>

                    {progress === 100 && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        เสร็จสมบูรณ์
                      </span>
                    )}
                  </div>

                  <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">
                    {project.name}
                  </h1>

                  {project.description && (
                    <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-muted-foreground sm:text-base">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="
                      flex
                      h-10
                      flex-1
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      bg-background
                      px-3
                      text-sm
                      font-medium
                      text-muted-foreground
                      transition
                      hover:border-primary/30
                      hover:bg-primary/5
                      hover:text-primary
                      sm:flex-none
                    "
                  >
                    <Pencil className="h-4 w-4" />
                    <span>แก้ไข</span>
                  </button>

                  <button
                    onClick={handleDeleteProject}
                    className="
                      flex
                      h-10
                      flex-1
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-red-200
                      bg-red-50
                      px-3
                      text-sm
                      font-medium
                      text-red-600
                      transition
                      hover:bg-red-100
                      sm:flex-none
                    "
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border bg-secondary/30 p-4 sm:p-5">
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

      <section className="rounded-2xl border bg-card">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ListTodo className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold sm:text-xl">
                  Tasks
                </h2>

                <p className="text-xs text-muted-foreground sm:text-sm">
                  {totalTasks} งานทั้งหมด
                </p>
              </div>
            </div>
          </div>

          <form
            action={createTask.bind(null, project.id)}
            className="mb-6 flex flex-col gap-2.5 sm:flex-row"
          >
            <div className="relative flex-1">
              <Plus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                type="text"
                name="title"
                required
                placeholder="เพิ่มขั้นตอนใหม่..."
                className="
                  h-11
                  w-full
                  rounded-xl
                  border
                  bg-background
                  pl-10
                  pr-4
                  text-sm
                  outline-none
                  transition
                  placeholder:text-muted-foreground/70
                  focus:border-primary/40
                  focus:ring-2
                  focus:ring-primary/20
                "
              />
            </div>

            <button
              type="submit"
              className="
                flex
                h-11
                w-full
                shrink-0
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-primary
                px-6
                text-sm
                font-semibold
                text-primary-foreground
                transition
                hover:bg-primary/90
                active:scale-[0.98]
                sm:w-auto
              "
            >
              <Plus className="h-4 w-4" />
              เพิ่มงาน
            </button>
          </form>

          <div className="space-y-2">
            {project.tasks?.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed px-5 py-14 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <ListTodo className="h-6 w-6 text-muted-foreground" />
                </div>

                <p className="font-medium">
                  ยังไม่มีขั้นตอนการทำงาน
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  เริ่มเพิ่มงานแรกของโปรเจคได้เลย
                </p>
              </div>
            ) : (
              project.tasks?.map((task: any, index: number) => (
                <div key={task.id}>
                  <div
                    className={`
                      group
                      rounded-2xl
                      border
                      p-3
                      transition-all
                      duration-200
                      sm:p-4
                      ${getTaskStyle(task.status)}
                    `}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div
                          className={`
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            text-sm
                            font-bold
                            sm:h-10
                            sm:w-10
                            ${
                              task.status === "done"
                                ? "bg-emerald-200 text-emerald-800"
                                : task.status === "in_progress"
                                  ? "bg-blue-200 text-blue-800"
                                  : "bg-primary/10 text-primary"
                            }
                          `}
                        >
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1 pt-1">
                          {editingTaskId === task.id ? (
                            <form
                              action={(formData) =>
                                handleUpdateTaskTitle(
                                  formData,
                                  task.id
                                )
                              }
                              className="flex flex-col gap-2 sm:flex-row"
                            >
                              <input
                                type="text"
                                name="title"
                                defaultValue={task.title}
                                autoFocus
                                required
                                className="
                                  h-9
                                  min-w-0
                                  flex-1
                                  rounded-lg
                                  border
                                  bg-background
                                  px-3
                                  text-sm
                                  outline-none
                                  focus:ring-2
                                  focus:ring-primary/20
                                "
                              />

                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  className="
                                    flex
                                    h-9
                                    flex-1
                                    items-center
                                    justify-center
                                    gap-1.5
                                    rounded-lg
                                    bg-primary
                                    px-3
                                    text-xs
                                    font-medium
                                    text-primary-foreground
                                    transition
                                    hover:bg-primary/90
                                    sm:flex-none
                                  "
                                >
                                  <Save className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingTaskId(null)
                                  }
                                  className="
                                    flex
                                    h-9
                                    flex-1
                                    items-center
                                    justify-center
                                    gap-1.5
                                    rounded-lg
                                    bg-secondary
                                    px-3
                                    text-xs
                                    font-medium
                                    transition
                                    hover:bg-secondary/80
                                    sm:flex-none
                                  "
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </form>
                          ) : (
                            <p
                              className={`
                                break-words
                                text-sm
                                font-medium
                                leading-6
                                sm:text-base
                                ${
                                  task.status === "done"
                                    ? "text-emerald-700/70 line-through"
                                    : "text-foreground"
                                }
                              `}
                            >
                              {task.title}
                            </p>
                          )}
                        </div>
                      </div>

                      {editingTaskId !== task.id && (
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                          <div className="grid w-full grid-cols-3 gap-1 rounded-xl border bg-muted/30 p-1 lg:w-auto">
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
                                className={`
                                  flex
                                  min-h-9
                                  w-full
                                  items-center
                                  justify-center
                                  gap-1.5
                                  rounded-lg
                                  px-2
                                  text-xs
                                  font-medium
                                  transition
                                  sm:px-3
                                  ${
                                    task.status === "todo"
                                      ? "bg-background text-foreground"
                                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                                  }
                                `}
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
                                className={`
                                  flex
                                  min-h-9
                                  w-full
                                  items-center
                                  justify-center
                                  gap-1.5
                                  rounded-lg
                                  px-2
                                  text-xs
                                  font-medium
                                  transition
                                  sm:px-3
                                  ${
                                    task.status === "in_progress"
                                      ? "bg-blue-100 text-blue-700"
                                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                                  }
                                `}
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
                                className={`
                                  flex
                                  min-h-9
                                  w-full
                                  items-center
                                  justify-center
                                  gap-1.5
                                  rounded-lg
                                  px-2
                                  text-xs
                                  font-medium
                                  transition
                                  sm:px-3
                                  ${
                                    task.status === "done"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                                  }
                                `}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                <span>เสร็จ</span>
                              </button>
                            </form>
                          </div>

                          <div className="flex w-full gap-2 lg:w-auto">
                            <button
                              onClick={() =>
                                setEditingTaskId(task.id)
                              }
                              className="
                                flex
                                h-9
                                flex-1
                                items-center
                                justify-center
                                gap-1.5
                                rounded-lg
                                border
                                bg-background
                                px-3
                                text-xs
                                font-medium
                                text-muted-foreground
                                transition
                                hover:border-primary/30
                                hover:bg-primary/5
                                hover:text-primary
                                lg:flex-none
                              "
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() =>
                                handleDeleteTask(task.id)
                              }
                              className="
                                flex
                                h-9
                                flex-1
                                items-center
                                justify-center
                                gap-1.5
                                rounded-lg
                                border
                                border-red-200
                                bg-red-50
                                px-3
                                text-xs
                                font-medium
                                text-red-600
                                transition
                                hover:bg-red-100
                                lg:flex-none
                              "
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {index < project.tasks.length - 1 && (
                    <div className="flex justify-center py-1.5">
                      <div className="flex flex-col items-center">
                        <div
                          className={`
                            h-4
                            w-0.5
                            rounded-full
                            ${
                              task.status === "done"
                                ? "bg-emerald-300"
                                : task.status === "in_progress"
                                  ? "bg-blue-300"
                                  : "bg-primary/40"
                            }
                          `}
                        />

                        <div
                          className={`
                            flex
                            h-6
                            w-6
                            items-center
                            justify-center
                            rounded-full
                            border
                            bg-background
                            ${
                              task.status === "done"
                                ? "border-emerald-300 text-emerald-500"
                                : task.status === "in_progress"
                                  ? "border-blue-300 text-blue-500"
                                  : "border-primary/50 text-primary"
                            }
                          `}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
