"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BoardNoteItem,
  deleteBoardNote,
  toggleBoardNoteShare,
} from "@/app/actions/board";
import { AvatarDisplay } from "./AvatarDisplay";
import { UserProfileModal, UserProfileData } from "./UserProfileModal";
import { ReactionButtons } from "./ReactionButtons";
import NoteContentRenderer from "./NoteContentRenderer";
import { NoteFormModal, NoteCategoryItem } from "./NoteFormModal";
import { Quality } from "@/app/actions/qualities";
import Swal from "sweetalert2";
import {
  Calendar,
  MessageCircle,
  FileText,
  Image as ImageIcon,
  ArrowUpRight,
  Clock,
  Trophy,
  Medal,
  Edit2,
  Trash2,
  Globe,
  Lock,
  Copy,
  Eye,
  Check,
  X,
  Share2,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BoardNoteCardProps {
  note: BoardNoteItem;
  rank?: number; // 1, 2, 3 สำหรับ Top Board
  categories?: NoteCategoryItem[];
  availableQualities?: Quality[];
  isMyNotesView?: boolean;
}

function BoardNoteCardComponent({
  note,
  rank,
  categories = [],
  availableQualities = [],
  isMyNotesView = false,
}: BoardNoteCardProps) {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);

  // สถานะข้อมูลของโน้ตที่สามารถแก้ไขและอัปเดตแบบเรียลไทม์
  const [currentNote, setCurrentNote] = useState<BoardNoteItem>(note);
  const [isDeleted, setIsDeleted] = useState(false);

  // สถานะการเปิด Modals
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isTogglingShare, setIsTogglingShare] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (isDeleted) {
    return null;
  }

  const author = currentNote.author;
  const authorName = author?.display_name || author?.username || "ผู้ใช้งาน";
  const isOwner = Boolean(currentNote.isOwner);
  const isShared = currentNote.is_shared !== false;

  // ตัด HTML และ Markdown ออกเพื่อแสดง Preview ข้อความสั้นๆ
  const plainText = (currentNote.content || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[#*`>\-_~]/g, "")
    .trim();

  // ประเมินเวลาในการอ่าน
  const readingTime = Math.max(1, Math.ceil((plainText.length || 100) / 350));

  const isImageAttachment =
    currentNote.file_path && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(currentNote.file_path);
  const isPdfAttachment = currentNote.file_path && /\.pdf$/i.test(currentNote.file_path);

  // ฟังก์ชันสลับสถานะเปิด/ปิดการแชร์
  const handleToggleShare = async () => {
    if (isTogglingShare) return;
    setIsTogglingShare(true);
    try {
      const res = await toggleBoardNoteShare(currentNote.id);
      setCurrentNote((prev) => ({
        ...prev,
        is_shared: res.is_shared,
        share_token: res.share_token || prev.share_token,
      }));

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: res.is_shared ? "เปิดการแชร์แล้ว" : "ปิดการแชร์แล้ว",
        showConfirmButton: false,
        timer: 2000,
      });

      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเปลี่ยนสถานะการแชร์";
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: msg,
      });
    } finally {
      setIsTogglingShare(false);
    }
  };

  // ฟังก์ชันลบโน้ต
  const handleDeleteNote = async () => {
    const result = await Swal.fire({
      title: "ยืนยันการลบโน้ต?",
      text: `คุณต้องการลบโน้ต "${currentNote.title}" หรือไม่? ข้อมูลจะถูกลบอย่างถาวร`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "ใช่, ลบเลย",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      try {
        await deleteBoardNote(currentNote.id);
        setIsDeleted(true);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "ลบโน้ตสำเร็จแล้ว",
          showConfirmButton: false,
          timer: 2000,
        });
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "ลบโน้ตไม่สำเร็จ";
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: msg,
        });
      }
    }
  };

  // คัดลอกลิงก์แชร์
  const handleCopyShareLink = () => {
    if (!currentNote.share_token) return;
    const url = `${window.location.origin}/share/note/${currentNote.share_token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "คัดลอกลิงก์แล้ว",
      showConfirmButton: false,
      timer: 1500,
    });
  };

  const getRankBadge = (r: number) => {
    if (r === 1) {
      return (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-[11px] border border-amber-200 shadow-xs">
          <Trophy className="w-3.5 h-3.5 fill-slate-950" />
          <span>#1 ยอดนิยม</span>
        </div>
      );
    }
    if (r === 2) {
      return (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800 font-black text-[11px] border border-slate-300 shadow-xs">
          <Medal className="w-3.5 h-3.5 text-slate-700" />
          <span>#2 ยอดนิยม</span>
        </div>
      );
    }
    if (r === 3) {
      return (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-700 to-amber-800 text-white font-black text-[11px] border border-amber-600 shadow-xs">
          <Medal className="w-3.5 h-3.5 text-amber-200" />
          <span>#3 ยอดนิยม</span>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <article
        className={cn(
          "relative bg-white rounded-3xl border flex flex-col justify-between group overflow-hidden transition-all shadow-xs hover:shadow-md",
          rank === 1
            ? "border-amber-300 bg-amber-50/20 hover:border-amber-400"
            : rank === 2
            ? "border-slate-300 bg-slate-50/30 hover:border-slate-400"
            : rank === 3
            ? "border-amber-700/30 bg-orange-50/15 hover:border-amber-700/50"
            : "border-slate-200 hover:border-indigo-300"
        )}
      >
        {/* Top Rank Badge */}
        {rank && getRankBadge(rank)}

        <div className="p-5 sm:p-6 flex flex-col gap-3.5">
          {/* Header Row: Category Badge, Owner Indicator, Reading Time & Date */}
          <div className="flex items-center justify-between gap-2 flex-wrap pr-16 sm:pr-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {currentNote.category ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 text-white text-[11px] font-medium tracking-tight">
                  {currentNote.category.name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-medium">
                  ทั่วไป
                </span>
              )}

              {/* Owner Badge */}
              {isOwner && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <UserCheck className="w-3 h-3" />
                  <span>โน้ตของคุณ</span>
                </span>
              )}

              {/* สถานะการแชร์ (แสดงเฉพาะในแท็บ "โน้ตของฉัน") */}
              {isOwner && isMyNotesView && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border",
                    isShared
                      ? "bg-sky-50 text-sky-700 border-sky-200"
                      : "bg-slate-100 text-slate-600 border-slate-300"
                  )}
                >
                  {isShared ? (
                    <>
                      <Globe className="w-3 h-3 text-sky-500" />
                      <span>เปิดแชร์อยู่</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3 text-slate-500" />
                      <span>ปิดแชร์อยู่</span>
                    </>
                  )}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{readingTime} นาที</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>
                  {new Date(currentNote.created_at).toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </span>
            </div>
          </div>

          {/* Author Row */}
          <div className="flex items-center gap-2.5 pt-1">
            <AvatarDisplay
              avatarType={author?.avatar_type}
              avatarIcon={author?.avatar_icon}
              avatarUrl={author?.avatar_url}
              name={authorName}
              size="sm"
              onClick={() => author && setSelectedUser(author as UserProfileData)}
              className="cursor-pointer hover:ring-2 hover:ring-indigo-500/80 transition-colors"
            />
            <div className="flex flex-col min-w-0">
              <button
                type="button"
                onClick={() => author && setSelectedUser(author as UserProfileData)}
                className="text-xs font-bold text-slate-800 hover:text-indigo-600 transition-colors truncate text-left"
              >
                {authorName}
              </button>
              <span className="text-[10px] text-slate-400 font-mono truncate">
                @{author?.username || "user"}
              </span>
            </div>
          </div>

          {/* Note Title & Content Preview (กดเพื่อเปิด Quick View หรือหน้าอ่านเต็ม) */}
          <div
            onClick={() => setIsQuickViewOpen(true)}
            className="group/link block space-y-1.5 pt-1 cursor-pointer"
          >
            <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover/link:text-indigo-600 transition-colors line-clamp-2 leading-snug">
              {currentNote.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 line-clamp-3 leading-relaxed">
              {plainText || "ไม่มีเนื้อหาข้อความตัวอย่าง คลิกเพื่อเปิดดูบันทึกฉบับเต็ม"}
            </p>
          </div>

          {/* Attachments preview pill if any */}
          {currentNote.file_path && (
            <div className="flex items-center gap-2 text-[11px] pt-0.5">
              {isImageAttachment ? (
                <span className="inline-flex items-center gap-1.5 text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-lg font-medium border border-sky-100">
                  <ImageIcon className="w-3 h-3" /> มีรูปภาพแนบ
                </span>
              ) : isPdfAttachment ? (
                <span className="inline-flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg font-medium border border-rose-100">
                  <FileText className="w-3 h-3" /> มีเอกสาร PDF แนบ
                </span>
              ) : null}
            </div>
          )}

          {/* Action Controls สำหรับเจ้าของโน้ต (แสดงเฉพาะในแท็บ "โน้ตของฉัน" เท่านั้น) */}
          {isOwner && isMyNotesView && (
            <div className="pt-3 mt-1 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              {/* กลุ่มปุ่มแก้ไขและลบ */}
              <div className="flex items-center gap-1.5">
                {/* ปุ่มแก้ไข */}
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="แก้ไขเนื้อหา, หมวดหมู่ และไฟล์แนบ"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>แก้ไข</span>
                </button>

                {/* ปุ่มลบ */}
                <button
                  type="button"
                  onClick={handleDeleteNote}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="ลบโน้ตนี้"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบ</span>
                </button>
              </div>

              {/* กลุ่มปุ่มจัดการสถานะเปิด-ปิดแชร์ */}
              <div className="flex items-center gap-1.5 ml-auto">
                {/* สลับสถานะเปิด/ปิดแชร์ */}
                <button
                  type="button"
                  onClick={handleToggleShare}
                  disabled={isTogglingShare}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border",
                    isShared
                      ? "bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                  )}
                  title={isShared ? "กดเพื่อปิดแชร์โน้ตนี้" : "กดเพื่อเปิดแชร์โน้ตนี้"}
                >
                  {isShared ? (
                    <>
                      <Globe className="w-3.5 h-3.5 text-sky-600" />
                      <span>เปิดแชร์</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>ปิดแชร์</span>
                    </>
                  )}
                </button>

                {/* คัดลอกลิงก์แชร์ */}
                {isShared && currentNote.share_token && (
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="คัดลอกลิงก์แชร์"
                  >
                    {copiedLink ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card Footer: Reactions, Comment count, Action button */}
        <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
          {/* Reaction Buttons */}
          <ReactionButtons
            noteId={currentNote.id}
            initialLikeCount={currentNote.likeCount}
            initialDislikeCount={currentNote.dislikeCount}
            initialUserReaction={currentNote.currentUserReaction}
            size="sm"
          />

          <div className="flex items-center gap-2.5">
            {/* Comment Counter */}
            {currentNote.share_token ? (
              <Link
                href={`/share/note/${currentNote.share_token}#comments`}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                title="ดูความคิดเห็น"
              >
                <MessageCircle className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                <span>{currentNote.commentCount}</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <MessageCircle className="w-4 h-4 text-slate-300" />
                <span>{currentNote.commentCount}</span>
              </span>
            )}

            {/* Read More / View Button */}
            {currentNote.share_token ? (
              <Link
                href={`/share/note/${currentNote.share_token}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
              >
                <span>อ่านฉบับเต็ม</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsQuickViewOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <span>ดูเนื้อหา</span>
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </article>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />

      {/* Quick View Modal (ดูเนื้อหาโน้ต) */}
      {isQuickViewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2 min-w-0">
                {currentNote.category && (
                  <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-white text-xs font-medium">
                    {currentNote.category.name}
                  </span>
                )}
                {currentNote.status && (
                  <span className="px-2 py-0.5 rounded-lg text-xs font-semibold border bg-white border-slate-200 text-slate-700">
                    {currentNote.status}
                  </span>
                )}
                {isOwner && (
                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    โน้ตของคุณ
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsQuickViewOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {currentNote.title}
              </h2>

              <div className="flex items-center gap-3 text-xs text-slate-400 pb-2 border-b border-slate-100">
                <span className="font-medium text-slate-700">{authorName}</span>
                <span>•</span>
                <span>
                  {new Date(currentNote.created_at).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              {/* Note Content */}
              <div className="text-sm text-slate-700 leading-relaxed pt-2">
                <NoteContentRenderer content={currentNote.content} readOnly={true} />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isOwner && isMyNotesView && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickViewOpen(false);
                        setIsEditModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickViewOpen(false);
                        handleDeleteNote();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบ</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentNote.share_token && (
                  <Link
                    href={`/share/note/${currentNote.share_token}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                  >
                    <span>เปิดหน้าเต็ม & พูดคุย</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setIsQuickViewOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Note Modal (ใช้ NoteFormModal ตัวเดียวกับหน้า Note) */}
      <NoteFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        note={{
          id: currentNote.id,
          title: currentNote.title,
          content: currentNote.content,
          status: currentNote.status,
          category_id: currentNote.category?.id || null,
          file_path: currentNote.file_path,
        }}
        categories={categories}
        availableQualities={availableQualities}
        noteType={currentNote.category?.note_type as any}
        onSuccess={async (savedData) => {
          const selectedCat = categories.find((c) => c.id === savedData.category_id);
          setCurrentNote((prev) => ({
            ...prev,
            title: savedData.title,
            content: savedData.content,
            status: savedData.status,
            file_path: savedData.file_path,
            category: selectedCat
              ? {
                  id: selectedCat.id,
                  name: selectedCat.name,
                  pic: selectedCat.pic,
                  note_type: selectedCat.note_type,
                }
              : prev.category,
            updated_at: new Date().toISOString(),
          }));
          router.refresh();
        }}
      />
    </>
  );
}

export const BoardNoteCard = React.memo(BoardNoteCardComponent);
