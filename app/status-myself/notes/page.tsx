"use client";

import { useEffect, useState, useRef } from "react";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/app/actions/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Swal from "sweetalert2";

type Category = { id: string; name: string };
type Note = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  category_id?: string | null;
  status: string;
  note_categories?: { name: string };
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // State สำหรับจัดการฟอร์ม Note
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("ทั่วไป");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // State สำหรับจัดการฟอร์ม Category
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const [filterCategory, setFilterCategory] = useState<string>("all");

  // 1. เพิ่ม State สำหรับจัดการการแสดงผลสถานะ "เสร็จสิ้น" (ค่าเริ่มต้นคือ false = ซ่อน)
  const [showCompleted, setShowCompleted] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State สำหรับเปิด/ปิด Modals
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catData, noteData] = await Promise.all([
        getCategories(),
        getNotes(),
      ]);
      setCategories(catData || []);
      setNotes(noteData || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. ปรับปรุงเงื่อนไขการ Filter
  const filteredNotes = notes.filter((note) => {
    // ตรวจสอบสถานะ: ถ้าไม่ได้ติ๊ก (showCompleted เป็น false) และสถานะคือ "เสร็จสิ้น" จะถูกกรองทิ้ง (ไม่แสดง)
    if (!showCompleted && note.status === "เสร็จสิ้น") return false;

    // ตรวจสอบหมวดหมู่ (คงเดิม)
    if (filterCategory === "all") return true;
    if (filterCategory === "none") return note.category_id === null;
    return note.category_id === filterCategory;
  });

  const getStatusBadgeColor = (noteStatus: string) => {
    switch (noteStatus) {
      case "สำคัญ":
        return "bg-red-200 text-red-800 border-red-300";
      case "กำลังทำ":
        return "bg-blue-200 text-blue-800 border-blue-300";
      case "เสร็จสิ้น":
        return "bg-green-200 text-green-800 border-green-300";
      default:
        return "bg-gray-200 text-gray-800 border-gray-300";
    }
  };

  const getCardStyle = (noteStatus: string) => {
    switch (noteStatus) {
      case "สำคัญ":
        return "bg-red-50 border-red-200 hover:border-red-300";
      case "กำลังทำ":
        return "bg-blue-50 border-blue-200 hover:border-blue-300";
      case "เสร็จสิ้น":
        return "bg-green-50 border-green-200 hover:border-green-300";
      default:
        return "bg-slate-50 border-slate-200 hover:border-slate-300";
    }
  };

  // ---- Note Handlers ----
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setIsSubmitting(true);

    const notePayload = {
      title,
      content,
      category_id: categoryId || null,
      status: status,
    };

    try {
      if (editingNoteId) {
        await updateNote(editingNoteId, notePayload);
        Swal.fire({
          icon: "success",
          title: "อัปเดตสำเร็จ!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createNote(notePayload);
        Swal.fire({
          icon: "success",
          title: "บันทึกสำเร็จ!",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      closeNoteModal();
      fetchData();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถบันทึกข้อมูลได้",
      });
    }
    setIsSubmitting(false);
  };

  const openNewNoteModal = () => {
    setEditingNoteId(null);
    setTitle("");
    setContent("");
    setCategoryId("");
    setStatus("ทั่วไป");
    setIsNoteModalOpen(true);
  };

  const handleEditNoteClick = (note: Note) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setContent(note.content || "");
    setCategoryId(note.category_id || "");
    setStatus(note.status || "ทั่วไป");
    setIsNoteModalOpen(true);
  };

  const closeNoteModal = () => {
    setIsNoteModalOpen(false);
    setEditingNoteId(null);
    setTitle("");
    setContent("");
    setCategoryId("");
    setStatus("ทั่วไป");
  };

  const handleInlineStatusChange = async (note: Note, newStatus: string) => {
    try {
      await updateNote(note.id, {
        title: note.title,
        content: note.content,
        category_id: note.category_id || null,
        status: newStatus,
      });

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "อัปเดตสถานะแล้ว",
        showConfirmButton: false,
        timer: 1500,
      });

      fetchData();
    } catch (error) {
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถอัปเดตสถานะได้", "error");
    }
  };

  const handleDeleteNote = async (id: string) => {
    const result = await Swal.fire({
      title: "ลบโน้ตนี้?",
      text: "คุณจะไม่สามารถกู้คืนข้อมูลนี้ได้!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ใช่, ลบเลย!",
    });
    if (result.isConfirmed) {
      try {
        await deleteNote(id);
        fetchData();
      } catch (error) {
        Swal.fire("ข้อผิดพลาด!", "ไม่สามารถลบโน้ตได้", "error");
      }
    }
  };

  const handleCopyContent = async (content: string) => {
    if (!content) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: "ไม่มีข้อความให้คัดลอก",
        showConfirmButton: false,
        timer: 1500,
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "คัดลอกข้อความแล้ว",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "คัดลอกไม่สำเร็จ",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  // ---- Category Handlers ----
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await createCategory(newCategoryName);
      setNewCategoryName("");
      fetchData();
    } catch (error) {
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถสร้างหมวดหมู่ได้", "error");
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingCategoryName.trim()) return;
    try {
      await updateCategory(id, editingCategoryName);
      setEditingCategoryId(null);
      fetchData();
    } catch (error) {
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถแก้ไขหมวดหมู่ได้", "error");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const result = await Swal.fire({
      title: "ลบหมวดหมู่นี้?",
      text: "โน้ตในหมวดหมู่นี้จะไม่ถูกลบ",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
    });
    if (result.isConfirmed) {
      try {
        await deleteCategory(id);
        fetchData();
      } catch (error) {
        Swal.fire("ข้อผิดพลาด", "ไม่สามารถลบหมวดหมู่ได้", "error");
      }
    }
  };

  if (isLoading)
    return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="container mx-auto px-8 py-9 max-w-5xl flex flex-col gap-8 border-2 rounded-3xl relative">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            ระบบจัดการบันทึก (Notes)
          </h1>
          <p className="text-muted-foreground">
            จัดการข้อความ หมวดหมู่ และสถานะของคุณในที่เดียว
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsCategoryModalOpen(true)}
            variant="outline"
          >
            จัดการหมวดหมู่
          </Button>
          <Button onClick={openNewNoteModal} className=" text-white">
            + สร้าง Note ใหม่
          </Button>
        </div>
      </div>

      {/* Main Content - List of Notes */}
      <div className="flex flex-col gap-4 border rounded-3xl px-5 py-6 bg-slate-50/30">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <h2 className="text-xl font-bold">รายการบันทึก</h2>

          {/* 3. เพิ่มส่วนควบคุม Filters ตรงนี้ */}
          <div className="flex flex-wrap items-center gap-6">
            {/* Checkbox แสดง/ซ่อน โน้ตที่เสร็จสิ้น */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showCompleted"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-slate-800 cursor-pointer"
              />
              <Label
                htmlFor="showCompleted"
                className="whitespace-nowrap cursor-pointer select-none"
              >
                แสดงรายการที่เสร็จสิ้น
              </Label>
            </div>

            {/* หมวดหมู่ (ของเดิม) */}
            <div className="flex items-center gap-2">
              <Label htmlFor="filter" className="whitespace-nowrap">
                หมวดหมู่
              </Label>
              <select
                id="filter"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="all">ทั้งหมด (All)</option>
                <option value="none">ไม่มีหมวดหมู่</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {filteredNotes.length === 0 ? (
            <p className="text-muted-foreground col-span-full text-center py-12 border-2 border-dashed rounded-xl">
              ไม่พบโน้ตในหมวดหมู่นี้ หรือยังไม่มีโน้ตเลย
            </p>
          ) : (
            filteredNotes.map((note, index) => (
              <Card
                key={note.id}
                className={`flex flex-col h-full relative group transition-colors shadow-sm overflow-hidden ${getCardStyle(note.status)}`}
              >
                <div className="absolute top-0 left-0 bg-foreground/10 text-foreground/70 px-2 py-0.5 rounded-br-lg text-xs font-bold z-10 backdrop-blur-sm">
                  #{index + 1}
                </div>

                <CardHeader className="pb-2 pt-8">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl pr-12">
                      {note.title}
                    </CardTitle>
                    <div className="flex gap-1 absolute top-4 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyContent(note.content)}
                        className="p-1.5 text-slate-600 hover:bg-slate-200/50 rounded-md transition-colors"
                        title="คัดลอกเนื้อหา"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10.986 3H12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.063A2 2 0 0 1 5.5 14h6a2.5 2.5 0 0 0 2.5-2.5V5.5A2 2 0 0 1 10.986 3ZM10.5 4v-.75a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75V4h3Z"
                            clipRule="evenodd"
                          />
                          <path
                            fillRule="evenodd"
                            d="M3 1a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H3Zm5.5 2v-.75a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75V3h3Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>

                      <button
                        onClick={() => handleEditNoteClick(note)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100/50 rounded-md transition-colors"
                        title="แก้ไข"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" />
                          <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1.5 text-red-600 hover:bg-red-100/50 rounded-md transition-colors"
                        title="ลบ"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.712Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <CardDescription className="flex gap-2 items-center mt-2">
                    <div className="relative inline-block">
                      <select
                        value={note.status || "ทั่วไป"}
                        onChange={(e) =>
                          handleInlineStatusChange(note, e.target.value)
                        }
                        className={`appearance-none px-2 pl-2 pr-6 py-0.5 rounded text-xs font-medium cursor-pointer outline-none border border-transparent hover:border-current transition-colors ${getStatusBadgeColor(note.status)}`}
                      >
                        <option
                          value="ทั่วไป"
                          className="bg-white text-slate-800"
                        >
                          ทั่วไป
                        </option>
                        <option
                          value="สำคัญ"
                          className="bg-white text-slate-800"
                        >
                          สำคัญ
                        </option>
                        <option
                          value="กำลังทำ"
                          className="bg-white text-slate-800"
                        >
                          กำลังทำ
                        </option>
                        <option
                          value="เสร็จสิ้น"
                          className="bg-white text-slate-800"
                        >
                          เสร็จสิ้น
                        </option>
                      </select>

                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>

                    {note.note_categories?.name && (
                      <span className="inline-block bg-slate-800 text-white px-2 py-0.5 rounded text-xs shadow-sm">
                        {note.note_categories.name}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-between">
                  <p className="text-sm line-clamp-4 mb-4 text-foreground/80 whitespace-pre-wrap">
                    {note.content || "ไม่มีรายละเอียด"}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-auto pt-4 border-t border-black/5 dark:border-white/5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-3.5 h-3.5"
                    >
                      <path d="M4.75 2.25a.75.75 0 0 0-1.5 0v1.41l-.146.126a1.5 1.5 0 0 0-.604 1.196v6.268a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V4.982a1.5 1.5 0 0 0-.604-1.196l-.146-.126V2.25a.75.75 0 0 0-1.5 0v1h-5v-1ZM4 5.5h8v5.75a.25.25 0 0 1-.25.25h-7.5a.25.25 0 0 1-.25-.25V5.5Z" />
                    </svg>
                    <span>
                      {new Date(note.created_at).toLocaleDateString("th-TH", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* --- MODAL: จัดการ Note --- */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-background rounded-xl shadow-xl overflow-hidden">
            <Card className="border-0 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  {editingNoteId ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="w-5 h-5 text-blue-500"
                      >
                        <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" />
                        <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
                      </svg>
                      แก้ไข Note
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8 1.5a.75.75 0 0 1 .75.75V7h4.75a.75.75 0 0 1 0 1.5H8.75v4.75a.75.75 0 0 1-1.5 0V8.5H2.5a.75.75 0 0 1 0-1.5h4.75V2.25A.75.75 0 0 1 8 1.5Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      สร้าง Note ใหม่
                    </>
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeNoteModal}
                  className="h-8 w-8 rounded-full"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSaveNote} className="flex flex-col gap-5">
                  <div className="grid gap-2">
                    <Label htmlFor="title">หัวข้อ (Title)</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="content">รายละเอียด (Content)</Label>
                    <textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="category">หมวดหมู่</Label>
                      <select
                        id="category"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">-- ไม่มีหมวดหมู่ --</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">สถานะ</Label>
                      <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="ทั่วไป">ทั่วไป</option>
                        <option value="สำคัญ">สำคัญ</option>
                        <option value="กำลังทำ">กำลังทำ</option>
                        <option value="เสร็จสิ้น">เสร็จสิ้น</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeNoteModal}
                      className="flex-1"
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting
                        ? "กำลังบันทึก..."
                        : editingNoteId
                          ? "อัปเดต Note"
                          : "บันทึก Note"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* --- MODAL: จัดการ Category --- */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-background rounded-xl shadow-xl overflow-hidden">
            <Card className="border-0 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.5 2A2.5 2.5 0 0 0 2 4.5v2.879a2.5 2.5 0 0 0 .732 1.767l4.5 4.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-4.5-4.5A2.5 2.5 0 0 0 7.38 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  จัดการหมวดหมู่
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="h-8 w-8 rounded-full"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-6">
                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <Input
                    placeholder="ชื่อหมวดหมู่ใหม่..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <Button type="submit" variant="secondary" size="icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 1.5a.75.75 0 0 1 .75.75V7h4.75a.75.75 0 0 1 0 1.5H8.75v4.75a.75.75 0 0 1-1.5 0V8.5H2.5a.75.75 0 0 1 0-1.5h4.75V2.25A.75.75 0 0 1 8 1.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Button>
                </form>

                <div className="flex flex-col gap-2 mt-2 max-h-[300px] overflow-y-auto pr-2">
                  {categories.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-4">
                      ยังไม่มีหมวดหมู่
                    </p>
                  )}
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between bg-muted/50 p-2.5 rounded-md group"
                    >
                      {editingCategoryId === cat.id ? (
                        <div className="flex w-full gap-2">
                          <Input
                            value={editingCategoryName}
                            onChange={(e) =>
                              setEditingCategoryName(e.target.value)
                            }
                            className="h-8"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleUpdateCategory(cat.id)}
                            className="px-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 16 16"
                              fill="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                fillRule="evenodd"
                                d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCategoryId(null)}
                            className="px-2 text-muted-foreground"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 16 16"
                              fill="currentColor"
                              className="w-4 h-4"
                            >
                              <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                            </svg>
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium">
                            {cat.name}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setEditingCategoryId(cat.id);
                                setEditingCategoryName(cat.name);
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                                className="w-3.5 h-3.5"
                              >
                                <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" />
                                <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
                              </svg>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteCategory(cat.id)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                                className="w-3.5 h-3.5"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.712Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
