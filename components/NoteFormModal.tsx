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
      setCategoryId(note?.category_id || (categories.length > 0 ? categories[0].id : ""));
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
                <div className="grid grid-cols-2 gap-4">
                  {/* หมวดหมู่ */}
                  <div className="grid min-w-0 gap-2">
                    <Label className="font-semibold text-xs sm:text-sm">หมวดหมู่ <span className="text-rose-500">*</span></Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full min-w-0 justify-between overflow-hidden h-10 px-3 bg-background font-normal cursor-pointer hover:border-primary/50"
                      onClick={() => setIsCategoryModalOpen(true)}
                      disabled={isSubmitting}
                    >
                      {selectedCategoryObj ? (
                        <div className="flex w-0 min-w-0 flex-1 items-center gap-2 overflow-hidden">
                          {noteType === "school" && (selectedCategoryObj.year || selectedCategoryObj.semester) && (
                            <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0">
                              {formatYearSemester(selectedCategoryObj.year, selectedCategoryObj.semester)}
                            </span>
                          )}
                          {selectedCategoryObj.pic ? (
                            <img
                              src={getPicUrl(selectedCategoryObj.pic)}
                              className="w-5 h-5 rounded object-cover shrink-0"
                              alt="pic"
                            />
                          ) : (
                            <div className="w-5 h-5 bg-slate-200 rounded shrink-0 flex items-center justify-center text-[10px] text-slate-500">
                              -
                            </div>
                          )}
                          <span className="block min-w-0 flex-1 truncate text-left" title={selectedCategoryObj.name}>
                            {selectedCategoryObj.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs sm:text-sm">
                          -- เลือกหมวดหมู่ --
                        </span>
                      )}
                    </Button>
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
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-background rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 md:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
              <div>
                <h3 className="font-bold text-xl flex items-center gap-2 text-foreground">
                  <Folder className="w-5 h-5 text-primary" />
                  เลือกหมวดหมู่สำหรับบันทึกนี้
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  เลือกหมวดหมู่ที่ตรงกับหัวข้อของคุณ
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 sm:w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="ค้นหาหมวดหมู่..."
                    className="w-full h-9 pl-9 pr-7 rounded-xl border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {categorySearch && (
                    <button
                      onClick={() => setCategorySearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full shrink-0 cursor-pointer"
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Year & Semester Filter Tabs */}
            {noteType === "school" && (
              <div className="flex flex-col gap-2 px-5 md:px-6 pt-3 pb-2.5 border-b bg-muted/10">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
                  <span className="text-xs font-semibold text-muted-foreground mr-1 shrink-0">
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
                      className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 transition-colors cursor-pointer ${
                        modalSelectYear === yTab.id
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {yTab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pt-1 border-t border-border/40">
                  <span className="text-xs font-semibold text-muted-foreground mr-1 shrink-0">
                    ภาคเรียน:
                  </span>
                  {[
                    { id: "all" as const, label: "ทุกภาคเรียน" },
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
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 transition-colors cursor-pointer ${
                        modalSelectSemester === sTab.id
                          ? "bg-indigo-500 text-white border-indigo-500 shadow-xs"
                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {sTab.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grid */}
            <div className="p-5 md:p-6 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {filteredCategories.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground text-xs">
                  ไม่พบหมวดหมู่ที่ตรงกับเงื่อนไข
                </div>
              ) : (
                filteredCategories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(cat.id);
                        setIsCategoryModalOpen(false);
                      }}
                      className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                          : "border-border bg-card hover:bg-muted/60"
                      }`}
                    >
                      {cat.pic ? (
                        <img
                          src={getPicUrl(cat.pic)}
                          className="w-9 h-9 rounded-xl object-cover shrink-0 border"
                          alt="pic"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Folder className="w-4 h-4" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs sm:text-sm text-foreground truncate">
                          {cat.name}
                        </p>
                        {noteType === "school" && (cat.year || cat.semester) && (
                          <span className="inline-block mt-1 bg-muted text-muted-foreground px-1.5 py-0.2 rounded text-[10px] font-medium">
                            {formatYearSemester(cat.year, cat.semester)}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}