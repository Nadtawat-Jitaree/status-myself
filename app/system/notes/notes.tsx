"use client";
import Image from "next/image";

import { useEffect, useState, useMemo } from "react";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  removeNoteAttachment,
  togglePinNote,
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
import { createClient } from "@/lib/supabase/client";
import {
  Pin,
  CheckSquare,
  Bold,
  List,
  Heading,
  Maximize2,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Download,
  X,
  Check,
  Search,
  Layers,
  FolderPlus,
  Folder,
  Share2,
  Globe,
} from "lucide-react";
import ShareModal from "@/components/ShareModal";
import NoteContentRenderer from "@/components/NoteContentRenderer";
import RichNoteEditor from "@/components/RichNoteEditor";
import { cn } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  pic?: string | null;
  is_shared?: boolean;
  share_token?: string | null;
};
type Note = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  category_id?: string | null;
  status: string;
  file_path?: string | null;
  is_pinned?: boolean;
  is_shared?: boolean;
  share_token?: string | null;
  note_categories?: { name: string; pic?: string | null };
  noteToEdit?: boolean;
};
type Props = {
  noteType: "normal" | "school";
};
import { redirect } from "next/navigation";

export default function NotesPage({ noteType }: Props) {
  if (!noteType || (noteType !== "normal" && noteType !== "school")) {
    redirect("/");
  }

  const getPicUrl = (picPath?: string | null) => {
    if (!picPath) return "";
    return createClient().storage.from("logo").getPublicUrl(picPath).data
      .publicUrl;
  };

  const [searchQuery, setSearchQuery] = useState("");

  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingFilePath, setExistingFilePath] = useState<string | null>(null);

  const [isDeletingFile, setIsDeletingFile] = useState(false);

  const [newCategoryPic, setNewCategoryPic] = useState<File | null>(null);
  const [newCategoryPicPreview, setNewCategoryPicPreview] = useState<
    string | null
  >(null);

  const [editingCategoryPic, setEditingCategoryPic] = useState<File | null>(
    null,
  );
  const [editingCategoryPicPreview, setEditingCategoryPicPreview] = useState<
    string | null
  >(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isNoteCategoryModalOpen, setIsNoteCategoryModalOpen] = useState(false);
  const [categoryFilterSearch, setCategoryFilterSearch] = useState("");
  const [categorySelectSearch, setCategorySelectSearch] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [shareItem, setShareItem] = useState<{
    type: "note" | "category";
    item: any;
  } | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleShareUpdate = (updatedData: {
    is_shared: boolean;
    share_token: string | null;
  }) => {
    if (!shareItem) return;
    if (shareItem.type === "note") {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === shareItem.item.id
            ? {
                ...n,
                is_shared: updatedData.is_shared,
                share_token: updatedData.share_token,
              }
            : n,
        ),
      );
      if (readingNote && readingNote.id === shareItem.item.id) {
        setReadingNote((prev: any) =>
          prev
            ? {
                ...prev,
                is_shared: updatedData.is_shared,
                share_token: updatedData.share_token,
              }
            : null,
        );
      }
    } else {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === shareItem.item.id
            ? {
                ...c,
                is_shared: updatedData.is_shared,
                share_token: updatedData.share_token,
              }
            : c,
        ),
      );
    }
    setShareItem((prev) =>
      prev
        ? {
            ...prev,
            item: {
              ...prev.item,
              is_shared: updatedData.is_shared,
              share_token: updatedData.share_token,
            },
          }
        : null,
    );
  };

  const categoryNoteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((n) => {
      if (n.category_id) {
        counts[n.category_id] = (counts[n.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [notes]);

  const getAttachmentUrl = (filePath?: string | null) => {
    if (!filePath) return "";
    return createClient().storage.from("note_attachments").getPublicUrl(filePath)
      .data.publicUrl;
  };

  const isImageFile = (path?: string | null) => {
    if (!path) return false;
    const ext = path.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext || "");
  };

  const handleTogglePin = async (noteId: string, nextPinned: boolean) => {
    setNotes((prev) =>
      prev
        .map((n) => (n.id === noteId ? { ...n, is_pinned: nextPinned } : n))
        .sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }),
    );
    try {
      await togglePinNote(noteId, nextPinned);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: nextPinned ? "ปักหมุดแล้ว 📌" : "ยกเลิกการปักหมุดแล้ว",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (err: any) {
      console.error("Toggle pin failed:", err);
      await loadNotes();
    }
  };

  const handleToggleChecklist = async (
    noteId: string,
    lineIndex: number,
    newChecked: boolean,
  ) => {
    const noteInState =
      (readingNote && readingNote.id === noteId ? readingNote : null) ||
      notes.find((n) => n.id === noteId);
    if (!noteInState) return;

    const lines = (noteInState.content || "").split("\n");
    if (lines[lineIndex] === undefined) return;

    const match = lines[lineIndex].match(
      /^(\s*(?:[-*]\s*)?\[)([ xX])(\]\s*)(.*)$/,
    );
    if (!match) return;

    lines[lineIndex] = `${match[1]}${newChecked ? "x" : " "}${match[3]}${match[4]}`;
    const newContent = lines.join("\n");

    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, content: newContent } : n)),
    );
    if (readingNote && readingNote.id === noteId) {
      setReadingNote((prev) =>
        prev ? { ...prev, content: newContent } : null,
      );
    }

    try {
      await updateNote(noteId, {
        title: noteInState.title,
        content: newContent,
        category_id: noteInState.category_id || null,
        status: noteInState.status,
        file_path: noteInState.file_path,
        is_pinned: noteInState.is_pinned,
      });
    } catch (err: any) {
      console.error("Failed to toggle checklist:", err);
      await loadNotes();
    }
  };

  const handleRemoveExistingPdf = async () => {
    if (!editingNoteId || !existingFilePath) return;

    const result = await Swal.fire({
      title: "ยืนยันการลบไฟล์?",
      text: "ไฟล์ PDF นี้จะถูกลบออกอย่างถาวร!",
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
        await removeNoteAttachment(editingNoteId, existingFilePath);
        setExistingFilePath(null);
        Swal.fire({
          icon: "success",
          title: "ลบไฟล์สำเร็จ!",
          timer: 1500,
          showConfirmButton: false,
        });
        await loadNotes();
      } catch (error: any) {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: error.message,
        });
      } finally {
        setIsDeletingFile(false);
      }
    }
  };

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("ทั่วไป");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const [filterCategory, setFilterCategory] = useState<string>("all");
  type StatusFilter = "all" | "ทั่วไป" | "สำคัญ" | "งานค้าง" | "เสร็จสิ้น";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, statusFilter, searchQuery]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [readingNote, setReadingNote] = useState<Note | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadPdfUrl = async () => {
      if (readingNote && readingNote.file_path) {
        const supabase = createClient();
        const { data, error } = await supabase.storage
          .from("note_attachments")
          .createSignedUrl(readingNote.file_path, 3600);

        if (data?.signedUrl) {
          setPdfUrl(data.signedUrl);
        }
      } else {
        setPdfUrl(null);
      }
    };
    loadPdfUrl();
  }, [readingNote]);

  useEffect(() => {
    initData();
    const supabase = createClient();

    const realtimeChannel = supabase
      .channel("notes-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes" },
        () => loadNotes(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "note_categories" },
        () => loadCategories(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [noteType]);

  const initData = async () => {
    setIsLoading(true);
    try {
      const [catData, noteData] = await Promise.all([
        getCategories(noteType),
        getNotes(noteType),
      ]);
      setCategories(catData || []);
      setNotes(noteData || []);
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      const noteData = await getNotes(noteType);
      setNotes(noteData || []);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const catData = await getCategories(noteType);
      setCategories(catData || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const statusCounts = useMemo(() => {
    const categoryNotes = notes.filter((note) => {
      if (filterCategory !== "all") {
        if (filterCategory === "none" && note.category_id !== null) return false;
        if (filterCategory !== "none" && note.category_id !== filterCategory) return false;
      }
      return true;
    });

    const counts = {
      all: categoryNotes.length,
      ทั่วไป: 0,
      สำคัญ: 0,
      งานค้าง: 0,
      เสร็จสิ้น: 0,
    };

    categoryNotes.forEach((n) => {
      const st = (n.status || "ทั่วไป") as keyof typeof counts;
      if (counts[st] !== undefined) {
        counts[st]++;
      } else {
        counts["ทั่วไป"]++;
      }
    });

    return counts;
  }, [notes, filterCategory]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const noteStatus = note.status || "ทั่วไป";
      if (statusFilter !== "all" && noteStatus !== statusFilter) return false;

      if (filterCategory !== "all") {
        if (filterCategory === "none" && note.category_id !== null)
          return false;
        if (filterCategory !== "none" && note.category_id !== filterCategory)
          return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = note.title?.toLowerCase().includes(query) || false;
        const matchContent =
          note.content?.toLowerCase().includes(query) || false;

        if (!matchTitle && !matchContent) return false;
      }

      return true;
    });
  }, [notes, statusFilter, filterCategory, searchQuery]);

  const totalPages = Math.ceil(filteredNotes.length / ITEMS_PER_PAGE);
  const paginatedNotes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredNotes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredNotes, currentPage]);

  const getStatusBadgeColor = (noteStatus: string) => {
    switch (noteStatus) {
      case "สำคัญ":
        return "bg-red-200 text-red-800 border-red-300";
      case "งานค้าง":
        return "bg-orange-200 text-orange-800 border-orange-300";
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
      case "งานค้าง":
        return "bg-orange-50 border-orange-200 hover:border-orange-300";
      case "เสร็จสิ้น":
        return "bg-green-50 border-green-200 hover:border-green-300";
      default:
        return "bg-slate-50 border-slate-200 hover:border-slate-300";
    }
  };

  const [file, setFile] = useState<File | null>(null);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmittingNote(true);

    try {
      let uploadedFilePath = null;

      if (file) {
        const supabase = createClient();
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("note_attachments")
          .upload(fileName, file);

        if (uploadError)
          throw new Error("อัปโหลดไฟล์ไม่สำเร็จ: " + uploadError.message);

        uploadedFilePath = uploadData.path;
      }
      if (!categoryId) {
        throw new Error("กรุณาเลือกหมวดหมู่");
      }
      const notePayload = {
        title,
        content,
        category_id: categoryId,
        status: status,
        ...(uploadedFilePath && { file_path: uploadedFilePath }),
      };

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
      setFile(null);
      await loadNotes();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.message || "ไม่สามารถบันทึกข้อมูลได้",
      });
    } finally {
      setIsSubmittingNote(false);
    }
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
    setExistingFilePath(note.file_path || null);
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
    const originalStatus = note.status;
    setNotes((prevNotes) =>
      prevNotes.map((n) =>
        n.id === note.id ? { ...n, status: newStatus } : n,
      ),
    );

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
    } catch (error) {
      setNotes((prevNotes) =>
        prevNotes.map((n) =>
          n.id === note.id ? { ...n, status: originalStatus } : n,
        ),
      );
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
        setNotes((prev) => prev.filter((note) => note.id !== id));
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

  const handleNewCategoryPicChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewCategoryPic(file);
      setNewCategoryPicPreview(URL.createObjectURL(file));
    }
  };

  const handleEditingCategoryPicChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditingCategoryPic(file);
      setEditingCategoryPicPreview(URL.createObjectURL(file));
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsSubmittingCategory(true);
    try {
      let picPath = null;
      if (newCategoryPic) {
        const supabase = createClient();
        const fileExt = newCategoryPic.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from("logo")
          .upload(fileName, newCategoryPic);
        if (error) throw new Error("อัปโหลดโลโก้ไม่สำเร็จ: " + error.message);
        picPath = data.path;
      }

      await createCategory(newCategoryName, noteType, picPath);
      setNewCategoryName("");
      setNewCategoryPic(null);
      setNewCategoryPicPreview(null);
      await loadCategories();
    } catch (error: any) {
      Swal.fire(
        "ข้อผิดพลาด",
        "ไม่สามารถสร้างหมวดหมู่ได้: " + error.message,
        "error",
      );
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingCategoryName.trim()) return;
    setIsSubmittingCategory(true);
    try {
      let picPath = undefined;
      if (editingCategoryPic) {
        const supabase = createClient();
        const fileExt = editingCategoryPic.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from("logo")
          .upload(fileName, editingCategoryPic);
        if (error)
          throw new Error("อัปโหลดโลโก้ใหม่ไม่สำเร็จ: " + error.message);
        picPath = data.path;
      }

      await updateCategory(id, editingCategoryName, picPath);
      setEditingCategoryId(null);
      setEditingCategoryPic(null);
      setEditingCategoryPicPreview(null);
      await loadCategories();
      await loadNotes();
    } catch (error: any) {
      Swal.fire(
        "ข้อผิดพลาด",
        "ไม่สามารถแก้ไขหมวดหมู่ได้: " + error.message,
        "error",
      );
    } finally {
      setIsSubmittingCategory(false);
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
        await loadCategories();
        await loadNotes();
      } catch (error) {
        Swal.fire("ข้อผิดพลาด", "ไม่สามารถลบหมวดหมู่ได้", "error");
      }
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64 p-8">
        <svg
          className="animate-spin h-8 w-8 text-slate-800"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );

  return (
    <div className="container mx-auto px-8 py-9 max-w-5xl flex flex-col gap-8 border-2 rounded-3xl relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            {noteType == "normal" && (
              <>
                <Image
                  src="/note.webp"
                  alt="ทั่วไป"
                  width={40}
                  height={40}
                  className="mr-2"
                  unoptimized
                />
                โน๊ตทั่วไป
              </>
            )}
            {noteType == "school" && (
              <>
                <Image
                  src="/school.webp"
                  alt="มหาลัย"
                  width={40}
                  height={40}
                  unoptimized
                  className="mr-2"
                />
                โน๊ตมหาวิทยาลัย
              </>
            )}
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
          <Button onClick={openNewNoteModal} className="text-white">
            + สร้าง Note ใหม่
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 border rounded-3xl px-5 py-6 bg-slate-50/30 bg-[url('/all.webp')] bg-contain bg-center bg-no-repeat">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight">รายการบันทึก</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-background/90 text-muted-foreground border border-border shadow-sm">
              {filteredNotes.length} รายการ
            </span>
          </div>

          <div className="flex items-center gap-2 relative self-start md:self-auto">
            <Label htmlFor="filter" className="whitespace-nowrap text-sm text-muted-foreground">
              หมวดหมู่:
            </Label>
            <Button
              type="button"
              variant="outline"
              className="flex h-9 w-[130px] md:w-[180px] justify-between px-3 text-sm bg-background font-normal border-border hover:bg-accent"
              onClick={() => setIsFilterModalOpen(true)}
            >
                {filterCategory === "all"
                  ? "ทั้งหมด (All)"
                  : (() => {
                      const cat = categories.find(
                        (c) => c.id === filterCategory,
                      );
                      return cat ? (
                        <div className="flex items-center gap-2 truncate">
                          {cat.pic ? (
                            <img
                              src={getPicUrl(cat.pic)}
                              className="w-5 h-5 rounded object-cover shrink-0"
                              alt="pic"
                            />
                          ) : (
                            <div className="w-5 h-5 bg-slate-200 rounded shrink-0 flex items-center justify-center text-[10px] text-slate-500">
                              -
                            </div>
                          )}
                          <span className="truncate">{cat.name}</span>
                        </div>
                      ) : (
                        "ทั้งหมด (All)"
                      );
                    })()}
              </Button>
            </div>
          </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
          {[
            {
              id: "all" as const,
              label: "ทั้งหมด",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              ),
              count: statusCounts.all,
              activeCls: "bg-slate-900 text-white border-slate-900 shadow-sm",
              badgeActive: "bg-slate-700 text-white",
            },
            {
              id: "ทั่วไป" as const,
              label: "ทั่วไป",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              count: statusCounts["ทั่วไป"],
              activeCls: "bg-sky-50 text-sky-700 border-sky-300 shadow-sm",
              badgeActive: "bg-sky-200/80 text-sky-800",
            },
            {
              id: "สำคัญ" as const,
              label: "สำคัญ",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.527.82-1.124 1.905-1.554 3.033C7.545 8.653 7 11.115 7 13.5A5.5 5.5 0 0012.5 19c3.038 0 5.5-2.462 5.5-5.5 0-2.417-1.12-4.526-2.583-6.223-.591-.685-1.189-1.32-1.722-1.87-.66-.682-1.144-1.295-1.3-1.854z" clipRule="evenodd" />
                </svg>
              ),
              count: statusCounts["สำคัญ"],
              activeCls: "bg-rose-50 text-rose-700 border-rose-300 shadow-sm",
              badgeActive: "bg-rose-200/80 text-rose-800",
            },
            {
              id: "งานค้าง" as const,
              label: "งานค้าง",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              ),
              count: statusCounts["งานค้าง"],
              activeCls: "bg-amber-50 text-amber-700 border-amber-300 shadow-sm",
              badgeActive: "bg-amber-200/80 text-amber-800",
            },
            {
              id: "เสร็จสิ้น" as const,
              label: "เสร็จสิ้น",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ),
              count: statusCounts["เสร็จสิ้น"],
              activeCls: "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm",
              badgeActive: "bg-emerald-200/80 text-emerald-800",
            },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap border shrink-0 cursor-pointer ${
                  isActive
                    ? tab.activeCls
                    : "bg-background/90 text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isActive
                      ? tab.badgeActive
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end text-end w-full">
          <div className="relative w-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <path
                fillRule="evenodd"
                d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                clipRule="evenodd"
              />
            </svg>
            <Input
              type="text"
              placeholder="ค้นหาชื่อหรือเนื้อหาโน้ต..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white/80"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {paginatedNotes.length === 0 ? (
            <p className="text-muted-foreground col-span-full text-center py-12 border-2 border-dashed rounded-xl">
              ไม่พบโน้ตในหมวดหมู่นี้ หรือยังไม่มีโน้ตเลย
            </p>
          ) : (
            paginatedNotes.map((note, index) => (
              <Card
                key={note.id}
                className={`flex flex-col h-full relative group overflow-hidden ${getCardStyle(note.status)}`}
              >
                <div className="absolute top-0 left-0 bg-foreground/10 text-foreground/70 px-2 py-0.5 rounded-br-lg text-xs font-bold z-10 ">
                  #{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                </div>

                {note.is_pinned && (
                  <div className="absolute top-0 left-12 bg-amber-500 text-white px-2 py-0.5 rounded-b-md text-[10px] font-bold flex items-center gap-1 shadow-sm z-10">
                    <Pin className="w-3 h-3 fill-white" /> ปักหมุด
                  </div>
                )}

                {note.is_shared && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareItem({ type: "note", item: note });
                      setIsShareModalOpen(true);
                    }}
                    className="absolute top-0 right-3 bg-sky-500 hover:bg-sky-600 text-white px-2 py-0.5 rounded-b-md text-[10px] font-bold flex items-center gap-1 shadow-sm z-10 cursor-pointer"
                    title="กำลังแชร์สาธารณะ (คลิกเพื่อดูลิงก์)"
                  >
                    <Share2 className="w-3 h-3" /> แชร์อยู่
                  </div>
                )}

                <CardHeader className="pb-2 pt-8">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl pr-12">
                      {note.title}
                    </CardTitle>
                    <div className="flex gap-1 absolute top-4 right-3 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleTogglePin(note.id, !note.is_pinned)}
                        className={`p-1.5 rounded-md ${
                          note.is_pinned
                            ? "text-amber-500 hover:bg-amber-100/50 bg-amber-50"
                            : "text-slate-400 hover:bg-slate-200/50 hover:text-slate-700"
                        }`}
                        title={
                          note.is_pinned
                            ? "ยกเลิกการปักหมุด"
                            : "ปักหมุดให้อยู่บนสุด"
                        }
                      >
                        <Pin
                          className={`w-4 h-4 ${note.is_pinned ? "fill-amber-500" : ""}`}
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareItem({ type: "note", item: note });
                          setIsShareModalOpen(true);
                        }}
                        className={`p-1.5 rounded-md ${
                          note.is_shared
                            ? "text-sky-600 hover:bg-sky-100/60 bg-sky-50"
                            : "text-slate-400 hover:bg-slate-200/50 hover:text-slate-700"
                        }`}
                        title="แชร์บันทึก"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setReadingNote(note)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-100/50 rounded-md"
                        title="อ่านแบบเต็มจอ"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path d="M2.5 3.5A1.5 1.5 0 0 1 4 2h3.5v9H4a1.5 1.5 0 0 0-1.5 1.5v.385A1.5 1.5 0 0 1 2 11.385V3.5ZM13.5 3.5A1.5 1.5 0 0 0 12 2H8.5v9H12a1.5 1.5 0 0 1 1.5 1.5v.385a1.5 1.5 0 0 0 .5-1.5V3.5Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleCopyContent(note.content)}
                        className="p-1.5 text-slate-600 hover:bg-slate-200/50 rounded-md"
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
                        className="p-1.5 text-blue-600 hover:bg-blue-100/50 rounded-md"
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
                        className="p-1.5 text-red-600 hover:bg-red-100/50 rounded-md"
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
                  <CardDescription className="flex flex-wrap gap-2 items-center mt-2">
                    <div className="relative inline-block">
                      <select
                        value={note.status || "ทั่วไป"}
                        onChange={(e) =>
                          handleInlineStatusChange(note, e.target.value)
                        }
                        className={`appearance-none px-2 pl-2 pr-6 py-0.5 rounded text-xs font-medium cursor-pointer outline-none border border-transparent hover:border-current ${getStatusBadgeColor(note.status)}`}
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
                          value="งานค้าง"
                          className="bg-white text-slate-800"
                        >
                          งานค้าง
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
                      <span className="inline-flex items-center gap-1.5 bg-slate-800 text-white px-2 py-0.5 rounded text-xs">
                        {note.note_categories.pic && (
                          <img
                            src={getPicUrl(note.note_categories.pic)}
                            className="w-3.5 h-3.5 rounded object-cover"
                            alt=""
                          />
                        )}
                        {note.note_categories.name}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="text-sm line-clamp-4 mb-4 text-foreground/80 overflow-hidden">
                    <NoteContentRenderer
                      content={note.content}
                      isCompact
                      emptyText="ไม่มีรายละเอียด"
                      onToggleChecklist={(lineIndex, newChecked) =>
                        handleToggleChecklist(note.id, lineIndex, newChecked)
                      }
                    />
                  </div>

                  {note.file_path && (
                    <div className="mb-4">
                      {isImageFile(note.file_path) ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImageUrl(getAttachmentUrl(note.file_path));
                          }}
                          className="relative group/img cursor-pointer overflow-hidden rounded-xl border bg-black/5 aspect-video max-h-36 flex items-center justify-center"
                        >
                          <img
                            src={getAttachmentUrl(note.file_path)}
                            alt="แนบรูปภาพ"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-xs gap-1.5 font-medium">
                            <Maximize2 className="w-3.5 h-3.5" /> คลิกดูรูปเต็ม
                          </div>
                        </div>
                      ) : (
                        <a
                          href={getAttachmentUrl(note.file_path)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-100"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>เอกสารแนบ (PDF)</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-auto pt-4 border-t border-black/5">
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

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              ก่อนหน้า
            </Button>
            <span className="text-sm font-medium text-slate-600">
              หน้า {currentPage} จาก {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              ถัดไป
            </Button>
          </div>
        )}
      </div>

      {isFilterModalOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsFilterModalOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-background rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 md:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
              <div>
                <h3 className="font-bold text-xl flex items-center gap-2 text-foreground">
                  <Folder className="w-5 h-5 text-primary" />
                  เลือกหมวดหมู่ที่ต้องการดู
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  เลือกหมวดหมู่เพื่อคัดกรองรายการบันทึก หรือค้นหาจากชื่อ
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={categoryFilterSearch}
                    onChange={(e) => setCategoryFilterSearch(e.target.value)}
                    placeholder="ค้นหาหมวดหมู่..."
                    className="w-full h-9 pl-9 pr-7 rounded-xl border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {categoryFilterSearch && (
                    <button
                      onClick={() => setCategoryFilterSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full shrink-0"
                  onClick={() => setIsFilterModalOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Card Grid */}
            <div className="p-5 md:p-6 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {/* Option: ทั้งหมด (All) */}
              {(!categoryFilterSearch ||
                "ทั้งหมด all".includes(categoryFilterSearch.toLowerCase())) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterCategory("all");
                    setIsFilterModalOpen(false);
                  }}
                  className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border text-center ${
                    filterCategory === "all"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  {filterCategory === "all" && (
                    <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center text-primary shadow-sm mb-3">
                    <Layers className="w-7 h-7" />
                  </div>
                  <span className="font-bold text-sm truncate w-full text-foreground">
                    ทั้งหมด (All)
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
                    {notes.length} บันทึก
                  </span>
                </button>
              )}

              {/* Dynamic Categories */}
              {categories
                .filter((cat) =>
                  cat.name
                    .toLowerCase()
                    .includes(categoryFilterSearch.toLowerCase()),
                )
                .map((cat) => {
                  const isSelected = filterCategory === cat.id;
                  const count = categoryNoteCounts[cat.id] || 0;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setFilterCategory(cat.id);
                        setIsFilterModalOpen(false);
                      }}
                      className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border text-center ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}

                      {cat.is_shared && (
                        <span
                          className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shadow-xs"
                          title="กำลังแชร์สาธารณะ"
                        >
                          <Globe className="w-3 h-3" />
                        </span>
                      )}

                      {cat.pic ? (
                        <img
                          src={getPicUrl(cat.pic)}
                          className="w-14 h-14 rounded-2xl object-cover shadow-sm mb-3"
                          alt={cat.name}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground shadow-sm mb-3">
                          <Folder className="w-7 h-7" />
                        </div>
                      )}

                      <span className="font-bold text-sm truncate w-full text-foreground">
                        {cat.name}
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
                        {count} บันทึก
                      </span>
                    </button>
                  );
                })}

              {/* Add New Category Card */}
              <button
                type="button"
                onClick={() => {
                  setIsFilterModalOpen(false);
                  setIsCategoryModalOpen(true);
                }}
                className="group flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-muted hover:border-primary/60 hover:bg-primary/5 text-muted-foreground hover:text-primary"
              >
                <div className="w-14 h-14 rounded-2xl bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center text-muted-foreground group-hover:text-primary mb-3">
                  <FolderPlus className="w-6 h-6" />
                </div>
                <span className="font-semibold text-xs">
                  + จัดการหมวดหมู่
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  เพิ่ม / แก้ไข
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {readingNote && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 md:p-10">
          <div
            className={`w-full h-full max-h-[90vh] bg-background rounded-2xl overflow-hidden flex flex-col relative ${!readingNote.file_path ? "max-w-4xl" : ""}`}
          >
            <div className="flex items-start justify-between p-6 border-b">
              <h2 className="text-2xl md:text-3xl font-bold pr-28 leading-tight">
                {readingNote.title}
              </h2>
              <div className="flex items-center gap-2 absolute top-5 right-5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShareItem({ type: "note", item: readingNote });
                    setIsShareModalOpen(true);
                  }}
                  className={`h-9 rounded-xl px-3 text-xs flex items-center gap-1.5 ${
                    readingNote.is_shared
                      ? "bg-sky-50 text-sky-700 border-sky-300 font-semibold"
                      : "text-slate-600 hover:text-sky-600"
                  }`}
                  title="แชร์บันทึกนี้"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{readingNote.is_shared ? "แชร์อยู่ 🌐" : "แชร์"}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setReadingNote(null)}
                  className="h-9 w-9 rounded-full hover:bg-slate-100"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-6 h-6"
                  >
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </Button>
              </div>
            </div>
            <div
              className={`flex-1 overflow-y-auto lg:overflow-auto p-6 md:p-8 bg-slate-50/50 ${readingNote.file_path ? "lg:grid lg:grid-cols-12" : ""}`}
            >
              <div
                className={`${readingNote.file_path ? "lg:col-span-6" : ""}`}
              >
                <div className="flex flex-wrap gap-2 mb-6 items-center text-sm">
                  {readingNote.note_categories?.name && (
                    <span className="flex items-center gap-1.5 bg-slate-800 text-white px-3 py-1 rounded-md">
                      {readingNote.note_categories.pic && (
                        <img
                          src={getPicUrl(readingNote.note_categories.pic)}
                          className="w-4 h-4 rounded object-cover"
                          alt="pic"
                        />
                      )}
                      {readingNote.note_categories.name}
                    </span>
                  )}
                  <span
                    className={`px-3 py-1 rounded-md border ${getStatusBadgeColor(readingNote.status)}`}
                  >
                    {readingNote.status}
                  </span>
                  <span className="text-muted-foreground ml-auto flex items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path d="M4.75 2.25a.75.75 0 0 0-1.5 0v1.41l-.146.126a1.5 1.5 0 0 0-.604 1.196v6.268a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V4.982a1.5 1.5 0 0 0-.604-1.196l-.146-.126V2.25a.75.75 0 0 0-1.5 0v1h-5v-1ZM4 5.5h8v5.75a.25.25 0 0 1-.25.25h-7.5a.25.25 0 0 1-.25-.25V5.5Z" />
                    </svg>
                    {new Date(readingNote.created_at).toLocaleDateString(
                      "th-TH",
                      {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}{" "}
                    น.
                  </span>
                </div>
                <div className="max-w-none text-base md:text-lg leading-relaxed text-slate-800 dark:text-slate-200 lg:h-[500px] overflow-y-auto pr-2">
                  <NoteContentRenderer
                    content={readingNote.content}
                    emptyText="ไม่มีรายละเอียดเนื้อหา"
                    onToggleChecklist={(lineIndex, newChecked) =>
                      handleToggleChecklist(
                        readingNote.id,
                        lineIndex,
                        newChecked,
                      )
                    }
                  />
                </div>
              </div>
              {readingNote.file_path && (
                <div className="mt-10 lg:ml-2 lg:mt-0 pt-8 border-t border-slate-200/60 lg:border-none lg:col-span-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                      {isImageFile(readingNote.file_path) ? (
                        <>
                          <ImageIcon className="w-5 h-5 text-blue-500" />
                          รูปภาพแนบ
                        </>
                      ) : (
                        <>
                          <FileText className="w-5 h-5 text-red-500" />
                          เอกสารแนบ (PDF)
                        </>
                      )}
                    </h3>
                    <a
                      href={getAttachmentUrl(readingNote.file_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg font-medium"
                    >
                      <Download className="w-3.5 h-3.5" /> ดาวน์โหลด / เปิดแท็บใหม่
                    </a>
                  </div>

                  {isImageFile(readingNote.file_path) ? (
                    <div
                      onClick={() =>
                        setPreviewImageUrl(
                          getAttachmentUrl(readingNote.file_path),
                        )
                      }
                      className="relative group cursor-pointer overflow-hidden rounded-xl border bg-black/5 flex items-center justify-center max-h-[500px]"
                    >
                      <img
                        src={getAttachmentUrl(readingNote.file_path)}
                        className="w-full h-auto max-h-[500px] object-contain rounded-xl"
                        alt="ไฟล์แนบ"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-sm gap-2 font-medium">
                        <Maximize2 className="w-4 h-4" /> คลิกเพื่อขยายเต็มจอ
                      </div>
                    </div>
                  ) : pdfUrl ? (
                    <iframe
                      src={pdfUrl}
                      className="w-full lg:h-[500px] rounded-xl border border-slate-200"
                      title="PDF Viewer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-[300px] bg-slate-100/50 rounded-xl border border-slate-200 border-dashed animate-pulse">
                      <span className="text-slate-500 font-medium">
                        กำลังโหลดเอกสาร...
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-3 bg-white">
              <Button
                variant="outline"
                onClick={() => handleCopyContent(readingNote.content)}
                className="gap-2"
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
                คัดลอกข้อความ
              </Button>
              <Button onClick={() => setReadingNote(null)}>ปิดหน้าต่าง</Button>
            </div>
          </div>
        </div>
      )}

      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-background rounded-xl overflow-hidden">
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
                      disabled={isSubmittingNote}
                    />
                  </div>
                  <RichNoteEditor
                    value={content}
                    onChange={setContent}
                    disabled={isSubmittingNote}
                  />

                  <div className="grid gap-2">
                    <Label htmlFor="file">แนบไฟล์ (PDF หรือ รูปภาพ - ทางเลือก)</Label>
                    {editingNoteId && existingFilePath && (
                      <div className="flex items-center justify-between p-3 border border-slate-200 bg-slate-50 rounded-md mb-2">
                        <span className="text-sm text-slate-600 truncate">
                          มีไฟล์แนบอยู่แล้ว ({existingFilePath.split(".").pop()?.toUpperCase()})
                        </span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleRemoveExistingPdf}
                          disabled={isDeletingFile || isSubmittingNote}
                          className="h-8 text-xs shrink-0"
                        >
                          ลบไฟล์นี้
                        </Button>
                      </div>
                    )}
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      disabled={isSubmittingNote || isDeletingFile}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>หมวดหมู่</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between h-10 px-3 bg-background font-normal"
                        onClick={() => setIsNoteCategoryModalOpen(true)}
                        disabled={isSubmittingNote}
                      >
                        {categoryId ? (
                          (() => {
                            const cat = categories.find(
                              (c) => c.id === categoryId,
                            );
                            return cat ? (
                              <div className="flex items-center gap-2 truncate">
                                {cat.pic ? (
                                  <img
                                    src={getPicUrl(cat.pic)}
                                    className="w-5 h-5 rounded object-cover shrink-0"
                                    alt="pic"
                                  />
                                ) : (
                                  <div className="w-5 h-5 bg-slate-200 rounded shrink-0 flex items-center justify-center text-[10px] text-slate-500">
                                    -
                                  </div>
                                )}
                                <span className="truncate">{cat.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                -- เลือกหมวดหมู่ --
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-muted-foreground">
                            -- เลือกหมวดหมู่ --
                          </span>
                        )}
                      </Button>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">สถานะ</Label>
                      <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        disabled={isSubmittingNote}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                      >
                        <option value="ทั่วไป">ทั่วไป</option>
                        <option value="สำคัญ">สำคัญ</option>
                        <option value="งานค้าง">งานค้าง</option>
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
                      disabled={isSubmittingNote}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmittingNote}
                      className="flex-1"
                    >
                      {isSubmittingNote
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

      {isNoteCategoryModalOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsNoteCategoryModalOpen(false)}
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
                    value={categorySelectSearch}
                    onChange={(e) => setCategorySelectSearch(e.target.value)}
                    placeholder="ค้นหาหมวดหมู่..."
                    className="w-full h-9 pl-9 pr-7 rounded-xl border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {categorySelectSearch && (
                    <button
                      onClick={() => setCategorySelectSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full shrink-0"
                  onClick={() => setIsNoteCategoryModalOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Grid */}
            <div className="p-5 md:p-6 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {categories
                .filter((cat) =>
                  cat.name
                    .toLowerCase()
                    .includes(categorySelectSearch.toLowerCase()),
                )
                .map((cat) => {
                  const isSelected = categoryId === cat.id;
                  const count = categoryNoteCounts[cat.id] || 0;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(cat.id);
                        setIsNoteCategoryModalOpen(false);
                      }}
                      className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border text-center hover:shadow-md ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}

                      {cat.pic ? (
                        <img
                          src={getPicUrl(cat.pic)}
                          className="w-12 h-12 rounded-2xl object-cover shadow-sm mb-2.5"
                          alt={cat.name}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground shadow-sm mb-2.5">
                          <Folder className="w-6 h-6" />
                        </div>
                      )}

                      <span className="font-bold text-sm truncate w-full text-foreground">
                        {cat.name}
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
                        {count} บันทึก
                      </span>
                    </button>
                  );
                })}

              {/* Add New Category Card */}
              <button
                type="button"
                onClick={() => {
                  setIsNoteCategoryModalOpen(false);
                  setIsCategoryModalOpen(true);
                }}
                className="group flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-muted hover:border-primary/60 hover:bg-primary/5 text-muted-foreground hover:text-primary"
              >
                <div className="w-12 h-12 rounded-2xl bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center text-muted-foreground group-hover:text-primary mb-2.5">
                  <FolderPlus className="w-6 h-6" />
                </div>
                <span className="font-semibold text-xs">
                  + จัดการหมวดหมู่
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  เพิ่มหมวดหมู่ใหม่
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-background rounded-xl overflow-hidden">
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
                <form
                  onSubmit={handleAddCategory}
                  className="flex gap-2 items-center"
                >
                  <label
                    className="cursor-pointer border border-dashed border-slate-300 rounded-md flex items-center justify-center w-10 h-10 hover:bg-slate-50 shrink-0 relative overflow-hidden group"
                    title="อัพโหลดรูป (1x1)"
                  >
                    {newCategoryPicPreview ? (
                      <img
                        src={newCategoryPicPreview}
                        className="w-full h-full object-cover"
                        alt="preview"
                      />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5 text-slate-400 group-hover:text-slate-500"
                      >
                        <path
                          fillRule="evenodd"
                          d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a2.75 2.75 0 0 0-3.885 0l-1.9 1.9a2.75 2.75 0 0 1-3.886 0l-3.11-3.11a2.75 2.75 0 0 0-3.885 0l-.114.114ZM14 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleNewCategoryPicChange}
                      disabled={isSubmittingCategory}
                    />
                  </label>
                  <Input
                    placeholder="ชื่อหมวดหมู่ใหม่..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    disabled={isSubmittingCategory}
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="icon"
                    disabled={isSubmittingCategory}
                  >
                    +
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
                        <div className="flex w-full gap-2 items-center">
                          <label className="cursor-pointer border border-dashed border-slate-300 rounded-md flex items-center justify-center w-8 h-8 hover:bg-slate-50 shrink-0 relative overflow-hidden group">
                            {editingCategoryPicPreview || cat.pic ? (
                              <img
                                src={
                                  editingCategoryPicPreview ||
                                  getPicUrl(cat.pic)
                                }
                                className="w-full h-full object-cover"
                                alt="preview"
                              />
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-4 h-4 text-slate-400 group-hover:text-slate-500"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a2.75 2.75 0 0 0-3.885 0l-1.9 1.9a2.75 2.75 0 0 1-3.886 0l-3.11-3.11a2.75 2.75 0 0 0-3.885 0l-.114.114ZM14 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleEditingCategoryPicChange}
                            />
                          </label>
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
                            disabled={isSubmittingCategory}
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
                            onClick={() => {
                              setEditingCategoryId(null);
                              setEditingCategoryPic(null);
                              setEditingCategoryPicPreview(null);
                            }}
                            className="px-2 text-muted-foreground"
                            disabled={isSubmittingCategory}
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
                          <div className="flex items-center gap-2">
                            {cat.pic ? (
                              <img
                                src={getPicUrl(cat.pic)}
                                className="w-6 h-6 object-cover rounded-md"
                                alt="pic"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-slate-200 rounded-md flex items-center justify-center text-[10px] text-slate-500">
                                -
                              </div>
                            )}
                            <span className="text-sm font-medium">
                              {cat.name}
                            </span>
                            {cat.is_shared && (
                              <span title="กำลังแชร์สาธารณะ" className="inline-flex items-center">
                                <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className={`h-7 w-7 ${
                                cat.is_shared
                                  ? "text-sky-600 bg-sky-50 hover:bg-sky-100"
                                  : "text-slate-400 hover:text-sky-600 hover:bg-sky-50"
                              }`}
                              title="แชร์หมวดหมู่นี้"
                              onClick={() => {
                                setShareItem({ type: "category", item: cat });
                                setIsShareModalOpen(true);
                              }}
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setEditingCategoryId(cat.id);
                                setEditingCategoryName(cat.name);
                                setEditingCategoryPic(null);
                                setEditingCategoryPicPreview(null);
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

      {previewImageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-12 right-0 flex items-center gap-2">
              <a
                href={previewImageUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30"
                title="ดาวน์โหลดรูปภาพ"
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewImageUrl}
              alt="รูปภาพขนาดเต็ม"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      {/* Share Modal for Note & Category */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        type={shareItem?.type || "note"}
        item={shareItem?.item || null}
        onUpdate={handleShareUpdate}
      />
    </div>
  );
}
