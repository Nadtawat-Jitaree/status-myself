"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { createProject } from "@/app/actions/projects";
import Swal from "sweetalert2";

export default function CreateProjectForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get("name") as string)?.trim();
    if (!name) return;

    setIsSubmitting(true);
    try {
      await createProject(formData);
      form.reset();
    } catch (error) {
      console.error("Failed to create project:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถสร้างโปรเจคได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card border rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Plus className="w-5 h-5 text-primary" />
        สร้างโปรเจคใหม่
      </h2>
      <form onSubmit={handleSubmit} className="lg:flex gap-4 items-end">
        <div className="lg:flex-1 space-y-2">
          <label className="text-sm font-medium">ชื่อโปรเจค</label>
          <input
            type="text"
            name="name"
            required
            disabled={isSubmitting}
            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
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
            disabled={isSubmitting}
            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            placeholder="เป้าหมายของโปรเจค..."
          />
        </div>
        <div className="flex justify-end lg:block lg:justify-start">
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 lg:mt-0 h-10 px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed rounded-md font-medium transition-colors inline-flex items-center justify-center gap-2 shrink-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              "บันทึก"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
