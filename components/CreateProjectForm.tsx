"use client";

import { useState } from "react";
import { Plus, Loader2, Target, ChevronDown, ChevronUp,  Save } from "lucide-react";
import { createProject } from "@/app/actions/projects";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";

export default function CreateProjectForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTargetInput, setShowTargetInput] = useState(false);

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
      setShowTargetInput(false);
    } catch (error) {
      console.error("Failed to create project:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถสร้างโปรเจกต์ได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card border rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          สร้างโปรเจกต์ใหม่
        </h2>
        <button
          type="button"
          onClick={() => setShowTargetInput(!showTargetInput)}
          className={`text-xs inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors ${
            showTargetInput
              ? "bg-primary/10 border-primary/30 text-primary font-medium"
              : "bg-muted/50 hover:bg-muted text-muted-foreground"
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>
            {showTargetInput ? "ซ่อนเป้าหมาย" : "+ กำหนดเป้าหมาย (Target)"}
          </span>
          {showTargetInput ? (
            <ChevronUp className="w-3 h-3 ml-0.5" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-0.5" />
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium">
              ชื่อโปรเจกต์ <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              disabled={isSubmitting}
              className="w-full flex h-10 rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              placeholder="เช่น สร้างคลิป Short, วิจัยระบบ..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium">
              รายละเอียด
            </label>
            <input
              type="text"
              name="description"
              disabled={isSubmitting}
              className="w-full flex h-10 rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              placeholder="เป้าหมายหรือคำอธิบายสั้นๆ..."
            />
          </div>
        </div>

        {/* Collapsible Target Fields */}
        {showTargetInput && (
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/[0.03] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                การตั้งเป้าหมายเชิงจำนวน (Target Tracker)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  จำนวนเป้าหมายรวม
                </label>
                <input
                  type="number"
                  name="target_count"
                  min="1"
                  step="1"
                  disabled={isSubmitting}
                  placeholder="เช่น 100"
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  หน่วย / สิ่งที่นับ
                </label>
                <input
                  type="text"
                  name="target_label"
                  disabled={isSubmitting}
                  placeholder="เช่น คลิป, ตอน, บทความ, เล่ม"
                  defaultValue="คลิป"
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={isSubmitting} className="text-white">
            <Save className="h-4 w-4" />
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              "บันทึก"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
