"use client";

import React, { useState, useEffect } from "react";
import { Folder, X, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { NoteCategoryItem } from "./NoteFormModal";
import { CategoryPickerModal } from "./CategoryPickerModal";

interface SaveDigitalNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (title: string, categoryId: string | null) => Promise<void> | void;
  initialTitle?: string;
  categories: NoteCategoryItem[];
  noteType?: string;
  isSaving?: boolean;
}

export function SaveDigitalNotebookModal({
  isOpen,
  onClose,
  onConfirm,
  initialTitle = "",
  categories,
  noteType = "normal",
  isSaving = false,
}: SaveDigitalNotebookModalProps) {
  const [title, setTitle] = useState(initialTitle || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const defaultTitle =
        initialTitle && initialTitle !== "สมุดจด PDF" && initialTitle !== "สมุดจดบันทึกดิจิทัล"
          ? initialTitle
          : `สมุดจดดิจิทัล (${new Date().toLocaleDateString("th-TH")})`;
      setTitle(defaultTitle);
      setSelectedCategoryId(categories.length > 0 ? categories[0].id : "");
      setValidationError(null);
    }
  }, [isOpen, initialTitle, categories]);

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);

  const getPicUrl = (picPath?: string | null) => {
    if (!picPath) return "";
    try {
      return createClient().storage.from("logo").getPublicUrl(picPath).data.publicUrl;
    } catch {
      return "";
    }
  };

  const formatSemester = (sem?: number | null) => {
    if (sem === 1) return "เทอม 1";
    if (sem === 2) return "เทอม 2";
    if (sem === 3) return "ฤดูร้อน";
    return "";
  };

  const formatYearSemester = (year?: number | null, sem?: number | null) => {
    const yStr = year ? `ปี ${year}` : "";
    const sStr = formatSemester(sem);
    if (yStr && sStr) return `${yStr} · ${sStr}`;
    if (yStr) return yStr;
    return sStr;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError("กรุณากรอกชื่อบันทึก");
      return;
    }
    setValidationError(null);
    await onConfirm(title.trim(), selectedCategoryId || null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
      >
        <div
          className="w-full max-w-lg bg-card text-card-foreground rounded-2xl sm:rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border bg-gradient-to-b from-muted/30 to-transparent flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-foreground leading-tight">
                  บันทึกสมุดจดดิจิทัลใหม่
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ระบุชื่อและเลือกหมวดหมู่สำหรับจัดเก็บสมุดจดเล่มนี้
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isSaving}
              className="h-8 w-8 rounded-lg shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-5">
            {/* Title Field */}
            <div className="grid gap-2">
              <Label htmlFor="note-title-input" className="font-semibold text-xs sm:text-sm text-foreground">
                ชื่อบันทึก (Title) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="note-title-input"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="ระบุชื่อสมุดจดบันทึก..."
                required
                disabled={isSaving}
                className="h-10 sm:h-11 rounded-xl text-sm bg-background border-input focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
              {validationError && (
                <p className="text-xs text-rose-500 font-medium">{validationError}</p>
              )}
            </div>

            {/* Category Selector Button */}
            <div className="grid gap-2">
              <Label className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-primary" />
                เลือกหมวดหมู่สำหรับบันทึกนี้ <span className="text-rose-500">*</span>
              </Label>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                disabled={isSaving}
                className={`group w-full flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary/60 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                  selectedCategoryObj
                    ? "border-primary/40 bg-primary/5 shadow-xs"
                    : "border-dashed border-muted-foreground/40 hover:border-primary/40 bg-muted/10"
                }`}
              >
                {selectedCategoryObj ? (
                  <>
                    {selectedCategoryObj.pic ? (
                      <img
                        src={getPicUrl(selectedCategoryObj.pic)}
                        className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-xs"
                        alt={selectedCategoryObj.name}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-xs">
                        <Folder className="w-5 h-5" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {selectedCategoryObj.name}
                      </p>
                      {noteType === "school" &&
                        (selectedCategoryObj.year || selectedCategoryObj.semester) && (
                          <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                            {formatYearSemester(
                              selectedCategoryObj.year,
                              selectedCategoryObj.semester
                            )}
                          </span>
                        )}
                    </div>

                    <span className="text-xs font-medium text-primary shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      เปลี่ยนหมวดหมู่
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0 group-hover:border-primary/40 transition-colors">
                      <Folder className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground font-semibold">
                        แตะเพื่อเลือกหมวดหมู่
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {categories.length} หมวดหมู่พร้อมใช้งาน
                      </p>
                    </div>
                    <span className="text-xs text-primary font-semibold shrink-0">
                      เลือก
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Footer Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={onClose}
                className="h-10 px-4 rounded-xl cursor-pointer text-xs sm:text-sm font-medium"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-10 px-5 rounded-xl cursor-pointer text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึกข้อมูล"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Category Selection Modal */}
      <CategoryPickerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={(catId) => {
          setSelectedCategoryId(catId);
          setIsCategoryModalOpen(false);
        }}
        noteType={noteType}
        zIndexClass="z-[120]"
      />
    </>
  );
}
