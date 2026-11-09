"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Folder,
  Search,
  Pin,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Download,
  X,
  Maximize2,
  Calendar,
  Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NoteContentRenderer from "@/components/NoteContentRenderer";

interface SharedCategoryViewProps {
  category: {
    id: string;
    name: string;
    description?: string | null;
    pic?: string | null;
    note_type?: string | null;
  };
  notes: Array<{
    id: string;
    title: string;
    content?: string | null;
    created_at: string;
    status?: string | null;
    file_path?: string | null;
    is_pinned?: boolean;
    note_categories?: {
      name: string;
      pic?: string | null;
    } | null;
  }>;
  supabaseUrl: string;
}

export default function SharedCategoryView({
  category,
  notes,
  supabaseUrl,
}: SharedCategoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [readingNote, setReadingNote] = useState<any | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const getAttachmentUrl = (filePath?: string | null) => {
    if (!filePath) return "";
    return `${supabaseUrl}/storage/v1/object/public/note_attachments/${filePath}`;
  };

  const getLogoUrl = (picPath?: string | null) => {
    if (!picPath) return "";
    return `${supabaseUrl}/storage/v1/object/public/logo/${picPath}`;
  };

  const isImageFile = (path?: string | null) => {
    if (!path) return false;
    const ext = path.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext || "");
  };

  const getStatusBadgeColor = (noteStatus?: string | null) => {
    switch (noteStatus) {
      case "สำคัญ":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "งานค้าง":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "เสร็จสิ้น":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: notes.length,
      ทั่วไป: 0,
      สำคัญ: 0,
      งานค้าง: 0,
      เสร็จสิ้น: 0,
    };
    notes.forEach((n) => {
      const st = n.status || "ทั่วไป";
      if (counts[st] !== undefined) {
        counts[st]++;
      } else {
        counts["ทั่วไป"]++;
      }
    });
    return counts;
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (statusFilter !== "all" && (note.status || "ทั่วไป") !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = note.title?.toLowerCase().includes(query);
        const matchContent = note.content?.toLowerCase().includes(query);
        if (!matchTitle && !matchContent) return false;
      }
      return true;
    });
  }, [notes, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/note.webp"
            alt="Logo"
            width={32}
            height={32}
            className="object-contain"
            unoptimized
          />
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            NJ Notes
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium ml-1">
            แชร์หมวดหมู่
          </span>
        </Link>
        <Link
          href="/auth/login"
          className="text-xs text-muted-foreground hover:text-foreground font-medium transition"
        >
          เข้าสู่ระบบ
        </Link>
      </header>

      {/* Hero Category Banner */}
      <div className="bg-white border-b py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {category.pic ? (
            <img
              src={getLogoUrl(category.pic)}
              alt={category.name}
              className="w-20 h-20 rounded-3xl object-cover shadow-sm border"
            />
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 border">
              <Folder className="w-10 h-10" />
            </div>
          )}

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {category.name}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border">
                {notes.length} บันทึก
              </span>
            </div>
            {category.description && (
              <p className="text-sm text-slate-500 max-w-xl">
                {category.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col gap-6">
        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm">
          {/* Status Chips */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-thin">
            {[
              { id: "all", label: "ทั้งหมด", count: statusCounts.all },
              { id: "ทั่วไป", label: "ทั่วไป", count: statusCounts["ทั่วไป"] },
              { id: "สำคัญ", label: "สำคัญ", count: statusCounts["สำคัญ"] },
              { id: "งานค้าง", label: "งานค้าง", count: statusCounts["งานค้าง"] },
              { id: "เสร็จสิ้น", label: "เสร็จสิ้น", count: statusCounts["เสร็จสิ้น"] },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition shrink-0 ${
                    isActive
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="ค้นหาในหมวดหมู่นี้..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.length === 0 ? (
            <div className="col-span-full py-16 text-center border-2 border-dashed rounded-3xl bg-white text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">ไม่พบโน้ตในเงื่อนไขที่เลือก</p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <Card
                key={note.id}
                onClick={() => setReadingNote(note)}
                className="cursor-pointer group hover:shadow-md transition-all border-slate-200 bg-white flex flex-col justify-between overflow-hidden relative"
              >
                {note.is_pinned && (
                  <div className="absolute top-0 right-4 bg-amber-500 text-white px-2 py-0.5 rounded-b-md text-[10px] font-bold flex items-center gap-1 shadow-sm z-10">
                    <Pin className="w-3 h-3 fill-white" /> ปักหมุด
                  </div>
                )}

                <CardHeader className="pb-3 pt-5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border ${getStatusBadgeColor(
                        note.status,
                      )}`}
                    >
                      {note.status || "ทั่วไป"}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-bold group-hover:text-sky-600 transition-colors line-clamp-1">
                    {note.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="text-sm text-slate-600 line-clamp-4 mb-4 overflow-hidden">
                    <NoteContentRenderer
                      content={note.content}
                      isCompact
                      readOnly
                      emptyText="ไม่มีเนื้อหา"
                    />
                  </div>

                  {note.file_path && (
                    <div className="mb-4">
                      {isImageFile(note.file_path) ? (
                        <div className="rounded-xl overflow-hidden border bg-slate-50 max-h-32 aspect-video flex items-center justify-center">
                          <img
                            src={getAttachmentUrl(note.file_path)}
                            alt="รูปแนบ"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200">
                          <FileText className="w-3.5 h-3.5" />
                          <span>เอกสารแนบ (PDF)</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(note.created_at).toLocaleDateString("th-TH", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-sky-600 font-medium group-hover:underline flex items-center gap-0.5">
                      อ่านฉบับเต็ม &rarr;
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Reading Note Modal */}
      {readingNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setReadingNote(null)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex items-start justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-medium border ${getStatusBadgeColor(
                      readingNote.status,
                    )}`}
                  >
                    {readingNote.status || "ทั่วไป"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(readingNote.created_at).toLocaleDateString("th-TH", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    น.
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {readingNote.title}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setReadingNote(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              <div className="text-slate-800 text-base leading-relaxed font-sans">
                <NoteContentRenderer
                  content={readingNote.content}
                  readOnly
                  emptyText="ไม่มีเนื้อหา"
                />
              </div>

              {readingNote.file_path && (
                <div className="pt-6 border-t flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                      {isImageFile(readingNote.file_path) ? (
                        <>
                          <ImageIcon className="w-4 h-4 text-sky-500" />
                          รูปภาพแนบ
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 text-red-500" />
                          เอกสารแนบ (PDF)
                        </>
                      )}
                    </span>
                    <a
                      href={getAttachmentUrl(readingNote.file_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
                    >
                      <Download className="w-3.5 h-3.5" /> เปิดในแท็บใหม่ / ดาวน์โหลด
                    </a>
                  </div>

                  {isImageFile(readingNote.file_path) ? (
                    <div
                      onClick={() => setPreviewImageUrl(getAttachmentUrl(readingNote.file_path))}
                      className="rounded-2xl overflow-hidden border bg-slate-50 max-h-[500px] flex items-center justify-center cursor-pointer group/img relative"
                    >
                      <img
                        src={getAttachmentUrl(readingNote.file_path)}
                        alt="รูปแนบ"
                        className="w-full h-auto max-h-[500px] object-contain"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1">
                        <Maximize2 className="w-4 h-4" /> ดูรูปขนาดเต็ม
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-red-100 bg-red-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            เอกสารแนบ PDF
                          </p>
                          <p className="text-xs text-slate-500">
                            คลิกเพื่อเปิดอ่านหรือดาวน์โหลดไฟล์
                          </p>
                        </div>
                      </div>
                      <a
                        href={getAttachmentUrl(readingNote.file_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition inline-flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        ดาวน์โหลด
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-slate-50/50 flex justify-end">
              <Button
                variant="outline"
                className="rounded-xl px-5"
                onClick={() => setReadingNote(null)}
              >
                ปิด
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <img
            src={previewImageUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-400 border-t bg-white">
        ระบบบันทึกข้อมูล NJ • แชร์หมวดหมู่ผ่านลิงก์สาธารณะ
      </footer>
    </div>
  );
}
