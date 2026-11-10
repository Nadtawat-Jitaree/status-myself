"use client";
import Image from "next/image";

import { useEffect, useState, useMemo } from "react";
import {
  getNotesPageData,
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
import {
  getCachedNotes,
  isCacheFresh,
  getCacheState,
  setCachedNotes,
  invalidateNotesCache,
  invalidateNoteQualitiesCache,
} from "@/lib/notes-cache";
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
  Lock,
  GraduationCap,
  ChevronDown,
  RotateCcw,
  Edit2,
  Trash2,
  Eye,
  Copy,
  Calendar,
} from "lucide-react";
import ShareModal from "@/components/ShareModal";
import { NoteFormModal } from "@/components/NoteFormModal";
import NoteContentRenderer from "@/components/NoteContentRenderer";
import RichNoteEditor from "@/components/RichNoteEditor";
import {
  getQualities,
  Quality,
} from "@/app/actions/qualities";

type Category = {
  id: string;
  name: string;
  pic?: string | null;
  is_shared?: boolean;
  share_token?: string | null;
  year?: number | null;
  semester?: number | null;
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
  note_categories?: {
    name: string;
    pic?: string | null;
    year?: number | null;
    semester?: number | null;
  };
  noteToEdit?: boolean;
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
type Props = {
  noteType: "normal" | "school";
  initialData?: {
    categories: Category[];
    notes: Note[];
  } | null;
};
import { redirect } from "next/navigation";

export default function NotesPage({ noteType, initialData }: Props) {
  if (!noteType || (noteType !== "normal" && noteType !== "school")) {
    redirect("/");
  }

  const getPicUrl = (picPath?: string | null) => {
    if (!picPath) return "";
    return createClient().storage.from("logo").getPublicUrl(picPath).data
      .publicUrl;
  };

  const [searchQuery, setSearchQuery] = useState("");

  const [notes, setNotes] = useState<Note[]>(() => {
    if (initialData?.notes) return initialData.notes;
    const cached = getCachedNotes(noteType);
    return (cached?.notes as Note[]) || [];
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    if (initialData?.categories) return initialData.categories;
    const cached = getCachedNotes(noteType);
    return (cached?.categories as Category[]) || [];
  });
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
    item: Note | Category;
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
        setReadingNote((prev: Note | null) =>
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
      invalidateNotesCache(noteType);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: nextPinned ? "ปักหมุดแล้ว" : "ยกเลิกการปักหมุดแล้ว",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      console.error("Failed to toggle checklist:", err);
      await loadNotes();
    }
  };

  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // ทักษะ & แต้ม
  const [availableQualities, setAvailableQualities] = useState<Quality[]>([]);

  // โหลดรายการทักษะของผู้ใช้เมื่อเข้าหน้านี้
  useEffect(() => {
    getQualities()
      .then((data) => setAvailableQualities(data.filter((q) => q.is_active)))
      .catch((err) => console.error("Error loading qualities in notes:", err));
  }, []);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryYear, setNewCategoryYear] = useState<number | null>(1);
  const [newCategorySemester, setNewCategorySemester] = useState<number | null>(1);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryYear, setEditingCategoryYear] = useState<number | null>(
    null,
  );
  const [editingCategorySemester, setEditingCategorySemester] = useState<number | null>(
    null,
  );

  // การกรองชั้นปี (University Year: "all" | 1 | 2 | 3 | 4 | "none")
  const [selectedYear, setSelectedYear] = useState<number | "all" | "none">(
    "all",
  );
  // การกรองภาคเรียน (Semester: "all" | 1 | 2 | 3 | "none")
  const [selectedSemester, setSelectedSemester] = useState<number | "all" | "none">(
    "all",
  );

  const [modalFilterYear, setModalFilterYear] = useState<number | "all" | "none">(
    "all",
  );
  const [modalFilterSemester, setModalFilterSemester] = useState<number | "all" | "none">(
    "all",
  );

  const [modalSelectYear, setModalSelectYear] = useState<number | "all" | "none">(
    "all",
  );
  const [modalSelectSemester, setModalSelectSemester] = useState<number | "all" | "none">(
    "all",
  );

  const [filterCategory, setFilterCategory] = useState<string>("all");
  type StatusFilter = "all" | "ทั่วไป" | "สำคัญ" | "งานค้าง" | "เสร็จสิ้น";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  type ShareFilter = "all" | "shared" | "private";
  const [shareFilter, setShareFilter] = useState<ShareFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, statusFilter, shareFilter, searchQuery, selectedYear, selectedSemester]);

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (initialData !== undefined && initialData !== null) return false;
    if (getCachedNotes(noteType)) return false;
    return true;
  });
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
        const { data } = await supabase.storage
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
    if (initialData) {
      setNotes(initialData.notes || []);
      setCategories(initialData.categories || []);
      setCachedNotes(noteType, initialData);
      setIsLoading(false);
    } else {
      initData();
    }

    const supabase = createClient();
    let isMounted = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !isMounted) return;

      const channelName = `user-notes-channel-${user.id}-${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notes",
            filter: `user_id=eq.${user.id}`,
          },
          () => loadNotes(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "note_categories",
            filter: `user_id=eq.${user.id}`,
          },
          () => loadCategories(),
        )
        .subscribe();

      if (!isMounted) {
        supabase.removeChannel(channel);
      } else {
        realtimeChannel = channel;
      }
    });

    return () => {
      isMounted = false;
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [noteType]);

  const initData = async (forceRefresh = false) => {
    // 1. ตรวจสอบ In-Memory Hash Cache พร้อม Stale-While-Revalidate (SWR)
    if (!forceRefresh) {
      const cacheState = getCacheState(noteType);
      const cached = getCachedNotes(noteType);
      if (cached) {
        setCategories(cached.categories);
        setNotes(cached.notes);
        setIsLoading(false);

        // หากแคชยังสดใหม่มาก (< 30s) ไม่ต้องยิงซ้ำ
        if (cacheState === "fresh") {
          return;
        }
        // หาก stale (30s - 5m) ให้ใช้ข้อมูลที่ render ไว้ทันที แล้ว silent refresh ใน background
        if (cacheState === "stale") {
          try {
            const data = await getNotesPageData(noteType);
            const newCats = data.categories || [];
            const newNotes = data.notes || [];
            setCategories(newCats);
            setNotes(newNotes);
            setCachedNotes(noteType, { categories: newCats, notes: newNotes });
          } catch (e) {
            console.warn("Background revalidate notes error:", e);
          }
          return;
        }
      }
    } else {
      invalidateNotesCache(noteType);
    }

    // หากไม่มีแคช ให้แสดงสถานะโหลด
    if (!getCachedNotes(noteType)) {
      setIsLoading(true);
    }

    try {
      // 2. ดึงข้อมูลแบบ Single Combined Action (ลด Roundtrips เหลือเพียง 1 ครั้ง)
      const data = await getNotesPageData(noteType);
      const newCats = data.categories || [];
      const newNotes = data.notes || [];
      setCategories(newCats);
      setNotes(newNotes);
      // บันทึกลง In-Memory Cache
      setCachedNotes(noteType, { categories: newCats, notes: newNotes });
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      const data = await getNotesPageData(noteType);
      const newNotes = data.notes || [];
      setNotes(newNotes);
      setCachedNotes(noteType, { categories, notes: newNotes });
    } catch (error) {
      console.error("Failed to refresh notes:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getNotesPageData(noteType);
      const newCats = data.categories || [];
      setCategories(newCats);
      setCachedNotes(noteType, { categories: newCats, notes });
    } catch (error) {
      console.error("Failed to refresh categories:", error);
    }
  };

  // Hash Map สำหรับ Category Lookup O(1) ช่วยเพิ่มประสิทธิภาพในการกรองและนับข้อมูล
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [categories]);

  // ฟังก์ชันสร้างชื่อไฟล์ด้วย SHA-256 Content Hashing ป้องกันการชนกันและการคาดเดาชื่อไฟล์
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

  const yearCounts = useMemo(() => {
    const counts = { all: notes.length, 1: 0, 2: 0, 3: 0, 4: 0, none: 0 };
    notes.forEach((n) => {
      const cat = n.category_id ? categoryMap.get(n.category_id) : undefined;
      const yr = n.note_categories?.year ?? cat?.year;
      if (yr === 1 || yr === 2 || yr === 3 || yr === 4) {
        counts[yr as 1 | 2 | 3 | 4]++;
      } else {
        counts.none++;
      }
    });
    return counts;
  }, [notes, categoryMap]);

  const hasUnassignedYearCats = useMemo(() => {
    return categories.some((c) => !c.year);
  }, [categories]);

  const semesterCounts = useMemo(() => {
    // นับจำนวนโน้ตในแต่ละเทอม (สอดคล้องกับ selectedYear ที่กำลังเลือก)
    const eligibleNotes = notes.filter((n) => {
      if (noteType !== "school" || selectedYear === "all") return true;
      const cat = n.category_id ? categoryMap.get(n.category_id) : undefined;
      const yr = n.note_categories?.year ?? cat?.year;
      if (selectedYear === "none") return !yr;
      return yr === selectedYear;
    });

    const counts = { all: eligibleNotes.length, 1: 0, 2: 0, 3: 0, none: 0 };
    eligibleNotes.forEach((n) => {
      const cat = n.category_id ? categoryMap.get(n.category_id) : undefined;
      const sem = n.note_categories?.semester ?? cat?.semester;
      if (sem === 1 || sem === 2 || sem === 3) {
        counts[sem as 1 | 2 | 3]++;
      } else {
        counts.none++;
      }
    });
    return counts;
  }, [notes, categoryMap, selectedYear, noteType]);

  const hasUnassignedSemesterCats = useMemo(() => {
    return categories.some((c) => !c.semester);
  }, [categories]);

  const statusCounts = useMemo(() => {
    const categoryNotes = notes.filter((note) => {
      if (noteType === "school") {
        const cat = note.category_id ? categoryMap.get(note.category_id) : undefined;
        const yr = note.note_categories?.year ?? cat?.year;
        const sem = note.note_categories?.semester ?? cat?.semester;

        if (selectedYear !== "all") {
          if (selectedYear === "none") {
            if (yr) return false;
          } else {
            if (yr !== selectedYear) return false;
          }
        }

        if (selectedSemester !== "all") {
          if (selectedSemester === "none") {
            if (sem) return false;
          } else {
            if (sem !== selectedSemester) return false;
          }
        }
      }

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
  }, [notes, filterCategory, selectedYear, selectedSemester, noteType, categoryMap]);

  const shareCounts = useMemo(() => {
    const eligibleNotes = notes.filter((note) => {
      if (noteType === "school") {
        const cat = note.category_id ? categoryMap.get(note.category_id) : undefined;
        const yr = note.note_categories?.year ?? cat?.year;
        const sem = note.note_categories?.semester ?? cat?.semester;

        if (selectedYear !== "all") {
          if (selectedYear === "none") {
            if (yr) return false;
          } else {
            if (yr !== selectedYear) return false;
          }
        }

        if (selectedSemester !== "all") {
          if (selectedSemester === "none") {
            if (sem) return false;
          } else {
            if (sem !== selectedSemester) return false;
          }
        }
      }

      if (filterCategory !== "all") {
        if (filterCategory === "none" && note.category_id !== null) return false;
        if (filterCategory !== "none" && note.category_id !== filterCategory) return false;
      }

      const noteStatus = note.status || "ทั่วไป";
      if (statusFilter !== "all" && noteStatus !== statusFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = note.title?.toLowerCase().includes(query) || false;
        const matchContent = note.content?.toLowerCase().includes(query) || false;
        if (!matchTitle && !matchContent) return false;
      }

      return true;
    });

    const shared = eligibleNotes.filter((n) => Boolean(n.is_shared)).length;
    return {
      all: eligibleNotes.length,
      shared,
      private: eligibleNotes.length - shared,
    };
  }, [notes, noteType, selectedYear, selectedSemester, filterCategory, statusFilter, searchQuery, categoryMap]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (noteType === "school") {
        const cat = note.category_id ? categoryMap.get(note.category_id) : undefined;
        const yr = note.note_categories?.year ?? cat?.year;
        const sem = note.note_categories?.semester ?? cat?.semester;

        if (selectedYear !== "all") {
          if (selectedYear === "none") {
            if (yr) return false;
          } else {
            if (yr !== selectedYear) return false;
          }
        }

        if (selectedSemester !== "all") {
          if (selectedSemester === "none") {
            if (sem) return false;
          } else {
            if (sem !== selectedSemester) return false;
          }
        }
      }

      const noteStatus = note.status || "ทั่วไป";
      if (statusFilter !== "all" && noteStatus !== statusFilter) return false;

      // ตัวกรองสถานะการแชร์ (Share Filter)
      if (shareFilter === "shared" && !note.is_shared) return false;
      if (shareFilter === "private" && note.is_shared) return false;

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
  }, [notes, statusFilter, shareFilter, filterCategory, searchQuery, noteType, selectedYear, selectedSemester, categoryMap]);

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

  const openNewNoteModal = () => {
    setEditingNote(null);
    setIsNoteModalOpen(true);
  };

  const handleEditNoteClick = (note: Note) => {
    setEditingNote(note);
    setIsNoteModalOpen(true);
  };

  const closeNoteModal = () => {
    setIsNoteModalOpen(false);
    setEditingNote(null);
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
      invalidateNotesCache(noteType);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "อัปเดตสถานะแล้ว",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch {
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
        invalidateNotesCache(noteType);
        invalidateNoteQualitiesCache(id);
        setNotes((prev) => prev.filter((note) => note.id !== id));
      } catch {
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
    } catch {
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
        const fileName = await hashFileToName(newCategoryPic);
        const { data, error } = await supabase.storage
          .from("logo")
          .upload(fileName, newCategoryPic);
        if (error) throw new Error("อัปโหลดโลโก้ไม่สำเร็จ: " + error.message);
        picPath = data.path;
      }

      await createCategory(
        newCategoryName,
        noteType,
        picPath,
        noteType === "school" ? newCategoryYear : null,
        noteType === "school" ? newCategorySemester : null,
      );
      setNewCategoryName("");
      setNewCategoryPic(null);
      setNewCategoryPicPreview(null);
      setNewCategoryYear(1);
      setNewCategorySemester(1);
      invalidateNotesCache(noteType);
      await loadCategories();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
      Swal.fire(
        "ข้อผิดพลาด",
        "ไม่สามารถสร้างหมวดหมู่ได้: " + message,
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
        const fileName = await hashFileToName(editingCategoryPic);
        const { data, error } = await supabase.storage
          .from("logo")
          .upload(fileName, editingCategoryPic);
        if (error)
          throw new Error("อัปโหลดโลโก้ใหม่ไม่สำเร็จ: " + error.message);
        picPath = data.path;
      }

      await updateCategory(
        id,
        editingCategoryName,
        picPath,
        noteType === "school" ? editingCategoryYear : undefined,
        noteType === "school" ? editingCategorySemester : undefined,
      );
      setEditingCategoryId(null);
      setEditingCategoryName("");
      setEditingCategoryYear(null);
      setEditingCategorySemester(null);
      setEditingCategoryPic(null);
      setEditingCategoryPicPreview(null);
      invalidateNotesCache(noteType);
      await loadCategories();
      await loadNotes();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
      Swal.fire(
        "ข้อผิดพลาด",
        "ไม่สามารถแก้ไขหมวดหมู่ได้: " + message,
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
        invalidateNotesCache(noteType);
        await loadCategories();
        await loadNotes();
      } catch {
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
        {/* Compact Year & Semester Bar for University Notes */}
        {noteType === "school" && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:px-4 sm:py-2.5 bg-background/90 border border-indigo-100 dark:border-indigo-950/60 rounded-2xl shadow-xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Year Selector */}
              <div className="flex items-center gap-1.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-600 text-white shrink-0">
                  <GraduationCap className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-foreground mr-1 hidden sm:inline">
                  ชั้นปี:
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { id: "all" as const, label: "ทุกปี", count: yearCounts.all },
                    { id: 1 as const, label: "ปี 1", count: yearCounts[1] },
                    { id: 2 as const, label: "ปี 2", count: yearCounts[2] },
                    { id: 3 as const, label: "ปี 3", count: yearCounts[3] },
                    { id: 4 as const, label: "ปี 4", count: yearCounts[4] },
                    ...(hasUnassignedYearCats
                      ? [{ id: "none" as const, label: "ไม่ระบุ", count: yearCounts.none }]
                      : []),
                  ].map((tab) => {
                    const isActive = selectedYear === tab.id;
                    return (
                      <button
                        key={String(tab.id)}
                        type="button"
                        onClick={() => {
                          setSelectedYear(tab.id);
                          if (tab.id !== "all" && filterCategory !== "all") {
                            const currentCat = categories.find((c) => c.id === filterCategory);
                            if (tab.id === "none") {
                              if (currentCat?.year) setFilterCategory("all");
                            } else if (currentCat?.year !== tab.id) {
                              setFilterCategory("all");
                            }
                          }
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                          isActive
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`text-[10px] px-1 py-0.2 rounded-full font-bold ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-5 bg-border/80 self-center" />

              {/* Semester Selector */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-muted-foreground mr-1 hidden sm:inline">
                  เทอม:
                </span>
                {[
                  { id: "all" as const, label: "ทุกเทอม", count: semesterCounts.all },
                  { id: 1 as const, label: "เทอม 1", count: semesterCounts[1] },
                  { id: 2 as const, label: "เทอม 2", count: semesterCounts[2] },
                  { id: 3 as const, label: "ฤดูร้อน", count: semesterCounts[3] },
                  ...(hasUnassignedSemesterCats
                    ? [{ id: "none" as const, label: "ไม่ระบุ", count: semesterCounts.none }]
                    : []),
                ].map((tab) => {
                  const isActive = selectedSemester === tab.id;
                  return (
                    <button
                      key={String(tab.id)}
                      type="button"
                      onClick={() => {
                        setSelectedSemester(tab.id);
                        if (tab.id !== "all" && filterCategory !== "all") {
                          const currentCat = categories.find((c) => c.id === filterCategory);
                          if (tab.id === "none") {
                            if (currentCat?.semester) setFilterCategory("all");
                          } else if (currentCat?.semester !== tab.id) {
                            setFilterCategory("all");
                          }
                        }
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                        isActive
                          ? "bg-indigo-500 text-white border-indigo-500 shadow-xs"
                          : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1 py-0.2 rounded-full font-bold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reset Year/Semester button if filtered */}
            {(selectedYear !== "all" || selectedSemester !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedYear("all");
                  setSelectedSemester("all");
                }}
                className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline px-1.5 py-0.5 rounded cursor-pointer ml-auto"
              >
                <span>รีเซ็ตปี/เทอม</span>
                <span>×</span>
              </button>
            )}
          </div>
        )}

        {/* Unified Search, Category & Status Filter Bar */}
        <div className="flex flex-col gap-3">
          {/* Top row: Search input + Category dropdown + Counter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ค้นหาชื่อหรือเนื้อหาโน้ต..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 bg-background/90 text-xs sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Button */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                className="flex h-9 min-w-[130px] sm:min-w-[160px] max-w-[220px] justify-between px-3 text-xs sm:text-sm bg-background font-normal border-border hover:bg-accent rounded-xl"
                onClick={() => {
                  setModalFilterYear(selectedYear);
                  setModalFilterSemester(selectedSemester);
                  setIsFilterModalOpen(true);
                }}
              >
                {filterCategory === "all" ? (
                  <div className="flex items-center gap-2 text-muted-foreground truncate">
                    <Folder className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate text-xs font-bold">ทุกหมวดหมู่ (All)</span>
                  </div>
                ) : (
                  (() => {
                    const cat = categories.find((c) => c.id === filterCategory);
                    return cat ? (
                      <div className="flex items-center gap-2 truncate text-foreground font-medium">
                        {cat.pic ? (
                          <img
                            src={getPicUrl(cat.pic)}
                            className="w-4 h-4 rounded object-cover shrink-0"
                            alt="pic"
                          />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                        <span className="truncate text-xs font-bold">{cat.name}</span>
                      </div>
                    ) : (
                      "ทุกหมวดหมู่ (All)"
                    );
                  })()
                )}
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1.5 opacity-60" />
              </Button>

              {/* Total Filtered Count Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border text-xs font-semibold text-muted-foreground shrink-0 shadow-2xs">
                <span>พบ</span>
                <span className="text-foreground font-bold">{filteredNotes.length}</span>
                <span>โน้ต</span>
              </div>
            </div>
          </div>

          {/* Bottom row: Status Filter Chips + Active Filter Summary */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
                  activeCls: "bg-slate-900 text-white border-slate-900 shadow-xs",
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
                  activeCls: "bg-sky-50 text-sky-700 border-sky-300 shadow-xs dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
                  badgeActive: "bg-sky-200/80 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
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
                  activeCls: "bg-rose-50 text-rose-700 border-rose-300 shadow-xs dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
                  badgeActive: "bg-rose-200/80 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
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
                  activeCls: "bg-amber-50 text-amber-700 border-amber-300 shadow-xs dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
                  badgeActive: "bg-amber-200/80 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
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
                  activeCls: "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
                  badgeActive: "bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
                },
              ].map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap border shrink-0 cursor-pointer transition-all ${
                      isActive
                        ? tab.activeCls
                        : "bg-background/90 text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
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

              {/* เส้นคั่นตัวกรองการแชร์ */}
              <div className="h-5 w-[1px] bg-border/60 shrink-0 mx-1 hidden sm:block" />

              {/* ปุ่มตัวกรองรายการที่แชร์ (Share Filter) */}
              <button
                type="button"
                onClick={() => setShareFilter(shareFilter === "shared" ? "all" : "shared")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap border shrink-0 cursor-pointer transition-all ${
                  shareFilter === "shared"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs dark:bg-indigo-600 dark:text-white"
                    : "bg-background/90 text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                }`}
                title="กรองแสดงเฉพาะโน้ตที่เปิดแชร์สาธารณะ"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>แชร์แล้ว</span>
                <span
                  className={`text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                    shareFilter === "shared"
                      ? "bg-white/25 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {shareCounts.shared}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShareFilter(shareFilter === "private" ? "all" : "private")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap border shrink-0 cursor-pointer transition-all ${
                  shareFilter === "private"
                    ? "bg-slate-800 text-white border-slate-800 shadow-xs dark:bg-slate-700"
                    : "bg-background/90 text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                }`}
                title="กรองแสดงเฉพาะโน้ตส่วนตัว (ยังไม่แชร์)"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>ส่วนตัว</span>
                <span
                  className={`text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                    shareFilter === "private"
                      ? "bg-white/25 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {shareCounts.private}
                </span>
              </button>
            </div>

            {/* Clear All Filters Button */}
            {(selectedYear !== "all" || selectedSemester !== "all" || filterCategory !== "all" || statusFilter !== "all" || shareFilter !== "all" || searchQuery !== "") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedYear("all");
                  setSelectedSemester("all");
                  setFilterCategory("all");
                  setStatusFilter("all");
                  setShareFilter("all");
                  setSearchQuery("");
                }}
                className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline shrink-0 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer ml-auto"
                title="ล้างตัวกรองทั้งหมด"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ล้างตัวกรอง</span>
              </button>
            )}
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
                onClick={() => setReadingNote(note)}
                className={`flex flex-col h-full relative group overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/40 transition-all duration-150 ${getCardStyle(note.status)}`}
              >
                {/* Index Number */}
                <div className="absolute top-0 left-0 bg-foreground/10 text-foreground/70 px-2 py-0.5 rounded-br-lg text-xs font-bold z-10">
                  #{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                </div>

                {/* Top Pinned & Shared Badges */}
                <div className="absolute top-0 left-12 flex items-center gap-1 z-10">
                  {note.is_pinned && (
                    <div className="bg-amber-500 text-white px-2 py-0.5 rounded-b-md text-[10px] font-bold flex items-center gap-1 shadow-xs">
                      <Pin className="w-2.5 h-2.5 fill-white" /> ปักหมุด
                    </div>
                  )}
                  {note.is_shared && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareItem({ type: "note", item: note });
                        setIsShareModalOpen(true);
                      }}
                      className="bg-sky-500 hover:bg-sky-600 text-white px-2 py-0.5 rounded-b-md text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                      title="กำลังแชร์สาธารณะ (คลิกเพื่อดูลิงก์)"
                    >
                      <Share2 className="w-2.5 h-2.5" /> แชร์อยู่
                    </div>
                  )}
                </div>

                {/* Top Right Quick Actions (Always visible, clean) */}
                <div
                  className="flex items-center gap-0.5 absolute top-2 right-2.5 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleTogglePin(note.id, !note.is_pinned)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      note.is_pinned
                        ? "text-amber-500 bg-amber-50 dark:bg-amber-950/50"
                        : "text-muted-foreground/60 hover:text-amber-500 hover:bg-muted"
                    }`}
                    title={note.is_pinned ? "ยกเลิกการปักหมุด" : "ปักหมุด"}
                  >
                    <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? "fill-amber-500" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShareItem({ type: "note", item: note });
                      setIsShareModalOpen(true);
                    }}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      note.is_shared
                        ? "text-sky-600 bg-sky-50 dark:bg-sky-950/50"
                        : "text-muted-foreground/60 hover:text-sky-600 hover:bg-muted"
                    }`}
                    title="แชร์บันทึก"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyContent(note.content)}
                    className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="คัดลอกข้อความ"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <CardHeader className="pb-2 pt-8">
                  <CardTitle className="text-base sm:text-lg font-bold pr-16 line-clamp-1">
                    {note.title}
                  </CardTitle>

                  {/* Category & Status Row */}
                  <CardDescription
                    className="flex flex-wrap gap-1.5 items-center mt-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Status inline select */}
                    <div className="relative inline-block">
                      <select
                        value={note.status || "ทั่วไป"}
                        onChange={(e) =>
                          handleInlineStatusChange(note, e.target.value)
                        }
                        className={`appearance-none px-2 pl-2 pr-5 py-0.5 rounded-md text-xs font-semibold cursor-pointer outline-none border border-transparent hover:border-current ${getStatusBadgeColor(note.status)}`}
                      >
                        <option value="ทั่วไป" className="bg-background text-foreground">
                          ทั่วไป
                        </option>
                        <option value="สำคัญ" className="bg-background text-foreground">
                          สำคัญ
                        </option>
                        <option value="งานค้าง" className="bg-background text-foreground">
                          งานค้าง
                        </option>
                        <option value="เสร็จสิ้น" className="bg-background text-foreground">
                          เสร็จสิ้น
                        </option>
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                    </div>

                    {/* Category Badge */}
                    {note.note_categories?.name && (
                      <span className="inline-flex items-center gap-1 bg-slate-800 text-white px-2 py-0.5 rounded-md text-xs truncate max-w-[160px]">
                        {noteType === "school" &&
                          (() => {
                            const cat = categories.find((c) => c.id === note.category_id);
                            const yr = note.note_categories?.year ?? cat?.year;
                            const sem = note.note_categories?.semester ?? cat?.semester;
                            const badgeText = formatYearSemester(yr, sem);
                            return badgeText ? (
                              <span className="bg-indigo-500 text-white px-1 py-0.2 rounded text-[9px] font-bold shrink-0">
                                {badgeText}
                              </span>
                            ) : null;
                          })()}
                        {note.note_categories.pic && (
                          <img
                            src={getPicUrl(note.note_categories.pic)}
                            className="w-3 h-3 rounded object-cover shrink-0"
                            alt=""
                          />
                        )}
                        <span className="truncate">{note.note_categories.name}</span>
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-between pt-1">
                  {/* Content Preview */}
                  <div className="text-sm line-clamp-3 mb-3 text-foreground/80 overflow-hidden">
                    <NoteContentRenderer
                      content={note.content}
                      isCompact
                      emptyText="ไม่มีรายละเอียด"
                      onToggleChecklist={(lineIndex, newChecked) =>
                        handleToggleChecklist(note.id, lineIndex, newChecked)
                      }
                    />
                  </div>

                  {/* Attachment Preview */}
                  {note.file_path && (
                    <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                      {isImageFile(note.file_path) ? (
                        <div
                          onClick={() => setPreviewImageUrl(getAttachmentUrl(note.file_path))}
                          className="relative group/img cursor-pointer overflow-hidden rounded-xl border bg-black/5 aspect-video max-h-32 flex items-center justify-center"
                        >
                          <img
                            src={getAttachmentUrl(note.file_path)}
                            alt="แนบรูปภาพ"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-xs gap-1.5 font-medium transition-opacity">
                            <Maximize2 className="w-3.5 h-3.5" /> คลิกดูรูปเต็ม
                          </div>
                        </div>
                      ) : (
                        <a
                          href={getAttachmentUrl(note.file_path)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900 hover:bg-red-100"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>เอกสารแนบ (PDF)</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Card Bottom: Date + Always-visible Action Buttons */}
                  <div className="flex items-center justify-between pt-2.5 mt-auto border-t border-border/50 text-xs">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate mr-2">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {new Date(note.created_at).toLocaleDateString("th-TH", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>

                    {/* Action Buttons: Read, Edit, Delete */}
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setReadingNote(note)}
                        className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 gap-1 rounded-md"
                        title="อ่านบันทึกแบบเต็ม"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>อ่าน</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditNoteClick(note)}
                        className="h-7 px-2 text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 gap-1 rounded-md"
                        title="แก้ไขบันทึก"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                        className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 gap-1 rounded-md"
                        title="ลบบันทึก"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบ</span>
                      </Button>
                    </div>
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

            {/* Year & Semester Filter Tabs inside Category Filter Modal */}
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
                      onClick={() => setModalFilterYear(yTab.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 transition-colors ${
                        modalFilterYear === yTab.id
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
                      onClick={() => setModalFilterSemester(sTab.id)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 transition-colors ${
                        modalFilterSemester === sTab.id
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
                .filter((cat) => {
                  if (noteType === "school") {
                    if (modalFilterYear !== "all") {
                      if (modalFilterYear === "none") {
                        if (cat.year) return false;
                      } else {
                        if (cat.year !== modalFilterYear) return false;
                      }
                    }
                    if (modalFilterSemester !== "all") {
                      if (modalFilterSemester === "none") {
                        if (cat.semester) return false;
                      } else {
                        if (cat.semester !== modalFilterSemester) return false;
                      }
                    }
                  }
                  return cat.name
                    .toLowerCase()
                    .includes(categoryFilterSearch.toLowerCase());
                })
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
                      {noteType === "school" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 mt-1">
                          {formatYearSemester(cat.year, cat.semester) || "ไม่ระบุปี/เทอม"}
                        </span>
                      )}
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
                  <span>{readingNote.is_shared ? "แชร์อยู่" : "แชร์"}</span>
                  {readingNote.is_shared && (
                    <Globe className="w-3 h-3 text-sky-500 ml-0.5" />
                  )}
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
                      {noteType === "school" &&
                        (() => {
                          const cat = categories.find(
                            (c) => c.id === readingNote.category_id,
                          );
                          const yr =
                            readingNote.note_categories?.year ?? cat?.year;
                          const sem =
                            readingNote.note_categories?.semester ?? cat?.semester;
                          const badgeText = formatYearSemester(yr, sem);
                          return badgeText ? (
                            <span className="bg-indigo-500 text-white px-1.5 py-0.2 rounded text-xs font-bold mr-0.5">
                              {badgeText}
                            </span>
                          ) : null;
                        })()}
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

      {/* Note Form Modal (Shared Component) */}
      <NoteFormModal
        isOpen={isNoteModalOpen}
        onClose={closeNoteModal}
        note={editingNote}
        categories={categories}
        availableQualities={availableQualities}
        noteType={noteType}
        onSuccess={async () => {
          invalidateNotesCache(noteType);
          await loadNotes();
        }}
      />

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
                  className="flex flex-col gap-2.5"
                >
                  <div className="flex gap-2 items-center">
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
                      placeholder={
                        noteType === "school"
                          ? "ชื่อวิชา / หมวดหมู่ใหม่..."
                          : "ชื่อหมวดหมู่ใหม่..."
                      }
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
                  </div>

                  {noteType === "school" && (
                    <div className="flex flex-col gap-2 px-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-semibold shrink-0">
                          กำหนดชั้นปี:
                        </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4].map((y) => (
                            <button
                              key={y}
                              type="button"
                              onClick={() => setNewCategoryYear(y)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                newCategoryYear === y
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-background text-muted-foreground border-border hover:bg-muted"
                              }`}
                            >
                              ปี {y}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setNewCategoryYear(null)}
                            className={`px-2 py-1 rounded-lg text-xs border transition-all ${
                              newCategoryYear === null
                                ? "bg-slate-700 text-white border-slate-700"
                                : "bg-background text-muted-foreground border-border hover:bg-muted"
                            }`}
                          >
                            ไม่ระบุ
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-semibold shrink-0">
                          ภาคเรียน:
                        </span>
                        <div className="flex items-center gap-1">
                          {[
                            { id: 1, label: "เทอม 1" },
                            { id: 2, label: "เทอม 2" },
                            { id: 3, label: "ฤดูร้อน" },
                          ].map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setNewCategorySemester(s.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                newCategorySemester === s.id
                                  ? "bg-indigo-500 text-white border-indigo-500 shadow-xs"
                                  : "bg-background text-muted-foreground border-border hover:bg-muted"
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setNewCategorySemester(null)}
                            className={`px-2 py-1 rounded-lg text-xs border transition-all ${
                              newCategorySemester === null
                                ? "bg-slate-700 text-white border-slate-700"
                                : "bg-background text-muted-foreground border-border hover:bg-muted"
                            }`}
                          >
                            ไม่ระบุ
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
                      className="flex min-w-0 items-center justify-between bg-muted/50 p-2.5 rounded-md group"
                    >
                      {editingCategoryId === cat.id ? (
                        <div className="flex flex-col w-full gap-2">
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
                                setEditingCategoryName("");
                                setEditingCategoryYear(null);
                                setEditingCategorySemester(null);
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

                          {noteType === "school" && (
                            <div className="flex flex-col gap-1.5 pl-10 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground font-medium">
                                  ชั้นปี:
                                </span>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4].map((y) => (
                                    <button
                                      key={y}
                                      type="button"
                                      onClick={() => setEditingCategoryYear(y)}
                                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                                        editingCategoryYear === y
                                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                                      }`}
                                    >
                                      ปี {y}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => setEditingCategoryYear(null)}
                                    className={`px-1.5 py-0.5 rounded text-[11px] border transition-all ${
                                      editingCategoryYear === null
                                        ? "bg-slate-700 text-white border-slate-700"
                                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                                    }`}
                                  >
                                    ไม่ระบุ
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground font-medium">
                                  ภาคเรียน:
                                </span>
                                <div className="flex items-center gap-1">
                                  {[
                                    { id: 1, label: "เทอม 1" },
                                    { id: 2, label: "เทอม 2" },
                                    { id: 3, label: "ฤดูร้อน" },
                                  ].map((s) => (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => setEditingCategorySemester(s.id)}
                                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                                        editingCategorySemester === s.id
                                          ? "bg-indigo-500 text-white border-indigo-500 shadow-xs"
                                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                                      }`}
                                    >
                                      {s.label}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => setEditingCategorySemester(null)}
                                    className={`px-1.5 py-0.5 rounded text-[11px] border transition-all ${
                                      editingCategorySemester === null
                                        ? "bg-slate-700 text-white border-slate-700"
                                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                                    }`}
                                  >
                                    ไม่ระบุ
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {cat.pic ? (
                              <img
                                src={getPicUrl(cat.pic)}
                                className="w-6 h-6 shrink-0 object-cover rounded-md"
                                alt="pic"
                              />
                            ) : (
                              <div className="w-6 h-6 shrink-0 bg-slate-200 rounded-md flex items-center justify-center text-[10px] text-slate-500">
                                -
                              </div>
                            )}
                            <span
                              className="min-w-0 flex-1 truncate text-sm font-medium"
                              title={cat.name}
                            >
                              {cat.name}
                            </span>
                            {noteType === "school" && (
                              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                {formatYearSemester(cat.year, cat.semester) || "ไม่ระบุปี/เทอม"}
                              </span>
                            )}
                            {cat.is_shared && (
                              <span title="กำลังแชร์สาธารณะ" className="inline-flex shrink-0 items-center">
                                <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1">
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
                                setEditingCategoryYear(cat.year ?? null);
                                setEditingCategorySemester(cat.semester ?? null);
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
