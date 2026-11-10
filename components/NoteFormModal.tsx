"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import RichNoteEditor from "@/components/RichNoteEditor";
import { QualityPicker } from "@/components/QualityPicker";
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

  // Modal สำหรับเลือกหมวดหมู่
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [modalSelectYear, setModalSelectYear] = useState<number | "all" | "none">("all");
  const [modalSelectSemester, setModalSelectSemester] = useState<number | "all" | "none">("all");

  const noteId = note?.id || null;
  const isEditMode = Boolean(noteId);

  // โหลดข้อมูลเมื่อเปิด modal หรือ note เปลี่ยน โดยใช้ Algorithm ป้องกัน Race Condition & Stale State
  useEffect(() => {
    if (!isOpen) {
      // เมื่อปิด modal ให้ยกเลิกคำขอที่ค้างอยู่และล้างสถานะ
      activeFetchNoteIdRef.current = null;
      previousNoteIdRef.current = undefined;
      setIsLoadingQualities(false);
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
      setContent(note.content || "");
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

      const cleanedContent = (content || "")
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
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-2 sm:p-4 animate-in fade-in duration-150">
        <div className="my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-lg min-h-0 flex-col overflow-hidden rounded-xl bg-background sm:max-h-[calc(100dvh-2rem)] shadow-2xl border">
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
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-8 w-8 rounded-full cursor-pointer hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </Button>
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

                {/* Rich Editor */}
                <div className="grid gap-2">
                  <RichNoteEditor
                    value={content}
                    onChange={setContent}
                    disabled={isSubmitting}
                  />
                </div>

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
                      className={`group w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary/60 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
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
      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-background rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="px-5 pb-4 pt-2 sm:p-5 md:p-6 border-b bg-gradient-to-b from-muted/30 to-transparent">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Folder className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-foreground leading-tight">
                      เลือกหมวดหมู่สำหรับบันทึกนี้
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      เลือกหมวดหมู่ที่ตรงกับหัวข้อของคุณ
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full shrink-0 cursor-pointer mt-1"
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="ค้นหาหมวดหมู่..."
                  className="w-full h-10 pl-9 pr-9 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
                  autoFocus
                />
                {categorySearch && (
                  <button
                    onClick={() => setCategorySearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Year & Semester Filter Tabs */}
            {noteType === "school" && (
              <div className="flex flex-col gap-2 px-5 pt-3 pb-2.5 border-b bg-muted/5">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
                  <span className="text-[11px] font-bold text-muted-foreground mr-1 shrink-0 uppercase tracking-wide">
                    ชั้นปี:
                  </span>
                  {[
                    { id: "all" as const, label: "ทุกชั้นปี" },
                    { id: 1 as const, label: "ปี 1" },
                    { id: 2 as const, label: "ปี 2" },
                    { id: 3 as const, label: "ปี 3" },
                    { id: 4 as const, label: "ปี 4" },
                    ...(hasUnassignedYearCats
                      ? [{ id: "none" as const, label: "ไม่ระบุ" }]
                      : []),
                  ].map((yTab) => (
                    <button
                      key={String(yTab.id)}
                      type="button"
                      onClick={() => setModalSelectYear(yTab.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 transition-all cursor-pointer ${
                        modalSelectYear === yTab.id
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:bg-muted/60"
                      }`}
                    >
                      {yTab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pt-1.5 border-t border-border/40 pb-0.5">
                  <span className="text-[11px] font-bold text-muted-foreground mr-1 shrink-0 uppercase tracking-wide">
                    เทอม:
                  </span>
                  {[
                    { id: "all" as const, label: "ทุกเทอม" },
                    { id: 1 as const, label: "เทอม 1" },
                    { id: 2 as const, label: "เทอม 2" },
                    { id: 3 as const, label: "ฤดูร้อน" },
                    ...(hasUnassignedSemesterCats
                      ? [{ id: "none" as const, label: "ไม่ระบุ" }]
                      : []),
                  ].map((sTab) => (
                    <button
                      key={String(sTab.id)}
                      type="button"
                      onClick={() => setModalSelectSemester(sTab.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 transition-all cursor-pointer ${
                        modalSelectSemester === sTab.id
                          ? "bg-indigo-500 text-white border-indigo-500 shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:bg-muted/60"
                      }`}
                    >
                      {sTab.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Grid */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-5 md:p-6">
              {filteredCategories.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                    <Folder className="w-7 h-7 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">ไม่พบหมวดหมู่ที่ตรงกับเงื่อนไข</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredCategories.map((cat) => {
                    const isSelected = categoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategoryId(cat.id);
                          setIsCategoryModalOpen(false);
                        }}
                        className={`group relative flex flex-col items-center gap-2.5 p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
                            : "border-border bg-card hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm"
                        }`}
                      >
                        {/* Selected badge */}
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}

                        {/* Icon / Image */}
                        {cat.pic ? (
                          <img
                            src={getPicUrl(cat.pic)}
                            className={`rounded-2xl object-cover shadow-sm transition-transform group-hover:scale-105 ${
                              isSelected ? "w-14 h-14" : "w-12 h-12"
                            }`}
                            alt={cat.name}
                          />
                        ) : (
                          <div
                            className={`rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 ${
                              isSelected
                                ? "w-14 h-14 bg-primary/15 text-primary shadow-sm"
                                : "w-12 h-12 bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                            }`}
                          >
                            <Folder className={isSelected ? "w-7 h-7" : "w-6 h-6"} />
                          </div>
                        )}

                        {/* Name */}
                        <p
                          className={`font-semibold text-xs leading-tight truncate w-full transition-colors ${
                            isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
                          }`}
                          title={cat.name}
                        >
                          {cat.name}
                        </p>

                        {/* Year/Semester badge for school */}
                        {noteType === "school" && (cat.year || cat.semester) && (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                              isSelected
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {formatYearSemester(cat.year, cat.semester)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t bg-muted/10 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {filteredCategories.length} หมวดหมู่
                {categorySearch && ` · ค้นหา "${categorySearch}"`}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 cursor-pointer text-xs"
                onClick={() => setIsCategoryModalOpen(false)}
              >
                ปิด
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}