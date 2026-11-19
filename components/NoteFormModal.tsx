"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Swal from "sweetalert2";
import { createClient } from "@/lib/supabase/client";
import {
  Folder,
  X,
  Search,
  Check,
  Edit2,
  Plus,
  Maximize2,
  Minimize2,
  PenTool,
} from "lucide-react";
import RichNoteEditor from "@/components/RichNoteEditor";
import { QualityPicker } from "@/components/QualityPicker";
import { CategoryPickerModal } from "./CategoryPickerModal";
import {
  updateNote,
  createNote,
  removeNoteAttachment,
} from "@/app/actions/notes";
import {
  getNoteQualities,
  syncNoteQualities,
  Quality,
  SelectedQualityInput,
} from "@/app/actions/qualities";
import {
  getCachedNoteQualities,
  setCachedNoteQualities,
} from "@/lib/notes-cache";

export interface NoteCategoryItem {
  id: string;
  name: string;
  pic?: string | null;
  note_type?: string | null;
  year?: number | null;
  semester?: number | null;
}

export interface NoteFormData {
  id?: string;
  title: string;
  content: string | null;
  status?: string | null;
  category_id?: string | null;
  file_path?: string | null;
  is_pinned?: boolean;
}

interface NoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  note?: NoteFormData | null;
  categories?: NoteCategoryItem[];
  availableQualities?: Quality[];
  noteType?: "normal" | "school";
  onSuccess?: (savedData: any) => void | Promise<void>;
}

export function NoteFormModal({
  isOpen,
  onClose,
  note,
  categories = [],
  availableQualities = [],
  noteType,
  onSuccess,
}: NoteFormModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("ทั่วไป");
  const [file, setFile] = useState<File | null>(null);
  const [existingFilePath, setExistingFilePath] = useState<string | null>(null);
  const [selectedQualities, setSelectedQualities] = useState<SelectedQualityInput[]>([]);
  const [isLoadingQualities, setIsLoadingQualities] = useState(false);

  // ป้องกัน Race Condition และความล่าช้าจากการโหลดข้าม Note
  const activeFetchNoteIdRef = useRef<string | null>(null);
  const previousNoteIdRef = useRef<string | null | undefined>(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Modal สำหรับเลือกหมวดหมู่
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [modalSelectYear, setModalSelectYear] = useState<number | "all" | "none">("all");
  const [modalSelectSemester, setModalSelectSemester] = useState<number | "all" | "none">("all");

  const noteId = note?.id || null;
  const isEditMode = Boolean(noteId);

  // ตรวจสอบว่า Note เป็นสมุดจด PDF / มีลายเส้น Annotation หรือไม่
  const isPdfAnnotation = useMemo(() => {
    return Boolean(
      note?.content && note.content.startsWith('{"type":"pdf_notes_annotation"')
    );
  }, [note?.content]);

  // โหลดข้อมูลเมื่อเปิด modal หรือ note เปลี่ยน โดยใช้ Algorithm ป้องกัน Race Condition & Stale State
  useEffect(() => {
    if (!isOpen) {
      // เมื่อปิด modal ให้ยกเลิกคำขอที่ค้างอยู่และล้างสถานะ
      activeFetchNoteIdRef.current = null;
      previousNoteIdRef.current = undefined;
      setIsLoadingQualities(false);
      setIsExpanded(false);
      return;
    }

    // ตรวจสอบว่า Note ID เปลี่ยนจริงหรือไม่ (ป้องกัน re-render ซ้ำซ้อนจาก Parent ที่ส่ง Object ใหม่)
    const isNewTarget = previousNoteIdRef.current !== noteId;
    if (!isNewTarget) {
      return;
    }
    previousNoteIdRef.current = noteId;

    if (note && noteId) {
      // --- โหมดแก้ไข Note ---
      setTitle(note.title || "");
      // ถ้าเป็นรูปแบบ PDF มีเส้นวาด ไม่ต้องแสดง raw JSON ในกล่องเนื้อหา
      setContent(isPdfAnnotation ? "" : note.content || "");
      setCategoryId(note.category_id || (categories.length > 0 ? categories[0].id : ""));
      setStatus(note.status || "ทั่วไป");
      setExistingFilePath(note.file_path || null);
      setFile(null);

      activeFetchNoteIdRef.current = noteId;

      // 1. ตรวจสอบ In-Memory Cache ความเร็ว O(1) (~0ms)
      const cached = getCachedNoteQualities(noteId);
      if (cached) {
        setSelectedQualities(cached);
        setIsLoadingQualities(false);
      } else {
        // ล้างข้อมูลทันที ไม่ให้มีค่าจาก Note เก่าตกค้างขณะโหลด
        setSelectedQualities([]);
        setIsLoadingQualities(true);

        getNoteQualities(noteId)
          .then((data) => {
            // ตรวจสอบว่า Note ที่ตอบกลับมายังเป็น Note ปัจจุบันหรือไม่
            if (activeFetchNoteIdRef.current === noteId) {
              setCachedNoteQualities(noteId, data);
              setSelectedQualities(data);
              setIsLoadingQualities(false);
            }
          })
          .catch((err) => {
            console.error("Error loading note qualities:", err);
            if (activeFetchNoteIdRef.current === noteId) {
              setIsLoadingQualities(false);
            }
          });
      }
    } else {
      // --- โหมดสร้าง Note ใหม่ ---
      // ยกเลิกคำขอเดิมทั้งหมดทันที และรีเซ็ตฟอร์มเป็นค่าเริ่มต้น
      activeFetchNoteIdRef.current = null;
      setTitle(note?.title || "");
      setContent(note?.content || "");
      // ไม่ auto-select หมวดหมู่ เพื่อให้ผู้ใช้เลือกเองอย่างชัดเจน
      setCategoryId(note?.category_id || "");
      setStatus(note?.status || "ทั่วไป");
      setExistingFilePath(null);
      setFile(null);
      setSelectedQualities([]);
      setIsLoadingQualities(false);
    }
  }, [isOpen, noteId, categories]);

  if (!isOpen) return null;

  const getPicUrl = (picPath?: string | null) => {
    if (!picPath) return "";
    return createClient().storage.from("logo").getPublicUrl(picPath).data.publicUrl;
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
    if (sStr) return sStr;
    return "";
  };

  const hashFileToName = async (targetFile: File): Promise<string> => {
    const ext = targetFile.name.split(".").pop()?.toLowerCase() || "bin";
    try {
      const arrayBuffer = await targetFile.arrayBuffer();
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .substring(0, 16);
      const entropySalt = Math.random().toString(36).substring(2, 8);
      return `${contentHash}_${entropySalt}.${ext}`;
    } catch {
      const fallbackHash = Math.random().toString(36).substring(2, 10);
      return `${Date.now()}_${fallbackHash}.${ext}`;
    }
  };

  const handleRemoveExistingPdf = async () => {
    if (!note?.id || !existingFilePath) return;

    const result = await Swal.fire({
      title: "ยืนยันการลบไฟล์?",
      text: "ไฟล์นี้จะถูกลบออกอย่างถาวร!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "ใช่, ลบเลย",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      setIsDeletingFile(true);
      try {
        await removeNoteAttachment(note.id, existingFilePath);
        setExistingFilePath(null);
        Swal.fire({
          icon: "success",
          title: "ลบไฟล์สำเร็จ!",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบไฟล์";
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: message,
        });
      } finally {
        setIsDeletingFile(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      Swal.fire({ icon: "warning", title: "กรุณากรอกหัวข้อโน้ต" });
      return;
    }
    if (!categoryId) {
      Swal.fire({ icon: "warning", title: "กรุณาเลือกหมวดหมู่" });
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedFilePath = existingFilePath;

      if (file) {
        const supabase = createClient();
        const fileName = await hashFileToName(file);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("note_attachments")
          .upload(fileName, file);

        if (uploadError) {
          throw new Error("อัปโหลดไฟล์ไม่สำเร็จ: " + uploadError.message);
        }
        uploadedFilePath = uploadData.path;
      }

      const cleanedContent = isPdfAnnotation
        ? (note?.content || "")
        : (content || "")
            .replace(/<span[^>]*>\s*<\/span>/gi, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

      const notePayload = {
        title: title.trim(),
        content: cleanedContent,
        category_id: categoryId,
        status: status,
        file_path: uploadedFilePath,
      };

      let savedId = note?.id;

      if (isEditMode && note?.id) {
        await updateNote(note.id, notePayload);
      } else {
        const createRes = await createNote(notePayload);
        savedId = createRes?.id;
      }

      // ซิงค์แต้ม/ทักษะหากมี
      if (savedId && selectedQualities.length >= 0) {
        try {
          await syncNoteQualities(savedId, title.trim(), selectedQualities);
          // อัปเดต In-Memory Cache ทันที เพื่อให้การเปิดแก้ไขครั้งถัดไปเร็วระดับ O(1) ~0ms
          setCachedNoteQualities(savedId, selectedQualities);
        } catch (qErr) {
          console.error("Error syncing note qualities:", qErr);
        }
      }

      Swal.fire({
        icon: "success",
        title: isEditMode ? "อัปเดต Note สำเร็จ!" : "บันทึก Note สำเร็จ!",
        timer: 1500,
        showConfirmButton: false,
      });

      if (onSuccess) {
        await onSuccess({
          id: savedId,
          ...notePayload,
        });
      }

      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึก";
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasUnassignedYearCats = categories.some((c) => !c.year);
  const hasUnassignedSemesterCats = categories.some((c) => !c.semester);

  const filteredCategories = categories.filter((cat) => {
    if (noteType === "school") {
      if (modalSelectYear !== "all") {
        if (modalSelectYear === "none") {
          if (cat.year) return false;
        } else if (cat.year !== modalSelectYear) {
          return false;
        }
      }
      if (modalSelectSemester !== "all") {
        if (modalSelectSemester === "none") {
          if (cat.semester) return false;
        } else if (cat.semester !== modalSelectSemester) {
          return false;
        }
      }
    }

    if (categorySearch.trim()) {
      return cat.name.toLowerCase().includes(categorySearch.toLowerCase());
    }

    return true;
  });

  const selectedCategoryObj = categories.find((c) => c.id === categoryId);

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in duration-150 ${
          isExpanded ? "overflow-hidden p-0" : "overflow-y-auto p-2 sm:p-4"
        }`}
      >
        <div
          className={`my-auto flex min-h-0 flex-col overflow-hidden bg-background shadow-2xl border ${
            isExpanded
              ? "h-[100dvh] w-screen max-h-none max-w-none rounded-none"
              : "max-h-[calc(100dvh-1rem)] w-full max-w-lg rounded-xl sm:max-h-[calc(100dvh-2rem)]"
          }`}
        >
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-0 shadow-none">
            {/* Header */}
            <CardHeader className="flex shrink-0 flex-row items-center justify-between border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                {isEditMode ? (
                  <>
                    <Edit2 className="w-5 h-5 text-blue-500" />
                    <span>แก้ไข Note</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-emerald-500" />
                    <span>สร้าง Note ใหม่</span>
                  </>
                )}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded((expanded) => !expanded)}
                  className="h-8 w-8 rounded-md cursor-pointer hover:bg-muted"
                  title={isExpanded ? "ย่อหน้าต่าง" : "ขยายเต็มจอ"}
                  aria-label={isExpanded ? "ย่อหน้าต่าง" : "ขยายเต็มจอ"}
                >
                  {isExpanded ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="h-8 w-8 rounded-md cursor-pointer hover:bg-muted"
                  title="ปิด"
                  aria-label="ปิด"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            {/* Content & Form */}
            <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pt-5 sm:p-6">
              <form onSubmit={handleSave} className="flex flex-col gap-5">
                {/* Title */}
                <div className="grid gap-2">
                  <Label htmlFor="title" className="font-semibold text-xs sm:text-sm">
                    หัวข้อ (Title) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="กรอกหัวข้อบันทึก..."
                    required
                    disabled={isSubmitting}
                    className="focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Rich Editor / PDF Annotation Banner */}
                {isPdfAnnotation ? (
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
                      <PenTool className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold">สมุดจด PDF / ดิจิทัล (มีลายมือและภาพวาด)</p>
                      <p className="text-[11px] sm:text-xs text-blue-600/80 dark:text-blue-400/80">
                        เนื้อหาและลายเส้นถูกบันทึกและจัดการผ่านกระดานวาด (Studio)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <RichNoteEditor
                      value={content}
                      onChange={setContent}
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {/* Quality Picker */}
                {availableQualities.length > 0 && (
                  <QualityPicker
                    qualities={availableQualities}
                    value={selectedQualities}
                    onChange={setSelectedQualities}
                    isLoading={isLoadingQualities}
                  />
                )}

                {/* Attachments */}
                <div className="grid gap-2">
                  <Label htmlFor="file" className="font-semibold text-xs sm:text-sm">
                    แนบไฟล์ (PDF หรือ รูปภาพ - ทางเลือก)
                  </Label>
                  {existingFilePath && (
                    <div className="flex items-center justify-between p-3 border border-slate-200 bg-slate-50 rounded-md mb-1">
                      <span className="text-xs sm:text-sm text-slate-600 truncate max-w-[260px]">
                        มีไฟล์แนบอยู่แล้ว ({existingFilePath.split(".").pop()?.toUpperCase()})
                      </span>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveExistingPdf}
                        disabled={isDeletingFile || isSubmitting}
                        className="h-8 text-xs shrink-0 cursor-pointer"
                      >
                        {isDeletingFile ? "กำลังลบ..." : "ลบไฟล์นี้"}
                      </Button>
                    </div>
                  )}
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    disabled={isSubmitting || isDeletingFile}
                    className="cursor-pointer file:cursor-pointer"
                  />
                </div>

                {/* Category & Status */}
                <div className="flex flex-col gap-3">
                  {/* หมวดหมู่ — full width, prominent */}
                  <div className="grid gap-2">
                    <Label className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-primary" />
                      หมวดหมู่ <span className="text-rose-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      disabled={isSubmitting}
                      className={`group w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary/60 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                        selectedCategoryObj
                          ? "border-primary/40 bg-primary/5"
                          : "border-dashed border-muted-foreground/40 hover:border-primary/40"
                      }`}
                    >
                      {selectedCategoryObj ? (
                        <>
                          {/* Icon */}
                          {selectedCategoryObj.pic ? (
                            <img
                              src={getPicUrl(selectedCategoryObj.pic)}
                              className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-sm"
                              alt={selectedCategoryObj.name}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-sm">
                              <Folder className="w-5 h-5" />
                            </div>
                          )}

                          {/* Name & badge */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">
                              {selectedCategoryObj.name}
                            </p>
                            {noteType === "school" && (selectedCategoryObj.year || selectedCategoryObj.semester) && (
                              <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                                {formatYearSemester(selectedCategoryObj.year, selectedCategoryObj.semester)}
                              </span>
                            )}
                          </div>

                          {/* Change hint */}
                          <span className="text-xs text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            เปลี่ยน
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-9 h-9 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0 group-hover:border-primary/40 transition-colors">
                            <Folder className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground font-bold">
                              แตะเพื่อเลือกหมวดหมู่
                            </p>
                            <p className="text-xs text-muted-foreground/60">
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

                  {/* สถานะ */}
                  <div className="grid gap-2">
                    <Label htmlFor="status" className="font-semibold text-xs sm:text-sm">สถานะ</Label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={isSubmitting}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="ทั่วไป">ทั่วไป</option>
                      <option value="สำคัญ">สำคัญ</option>
                      <option value="งานค้าง">งานค้าง</option>
                      <option value="เสร็จสิ้น">เสร็จสิ้น</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 cursor-pointer"
                    disabled={isSubmitting}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isSubmitting
                      ? "กำลังบันทึก..."
                      : isEditMode
                      ? "อัปเดต Note"
                      : "บันทึก Note"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Category Selection Modal */}
      <CategoryPickerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        selectedCategoryId={categoryId}
        onSelectCategory={(id) => {
          setCategoryId(id);
          setIsCategoryModalOpen(false);
        }}
        noteType={noteType}
        zIndexClass="z-[80]"
      />
    </>
  );
}