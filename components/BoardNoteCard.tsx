"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BoardNoteItem } from "@/app/actions/board";
import { AvatarDisplay } from "./AvatarDisplay";
import { UserProfileModal, UserProfileData } from "./UserProfileModal";
import { ReactionButtons } from "./ReactionButtons";
import {
  Calendar,
  MessageCircle,
  FileText,
  Image as ImageIcon,
  ArrowUpRight,
  Clock,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BoardNoteCardProps {
  note: BoardNoteItem;
  rank?: number; // 1, 2, 3 สำหรับ Top Board
}

export function BoardNoteCard({ note, rank }: BoardNoteCardProps) {
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);

  const author = note.author;
  const authorName = author?.display_name || author?.username || "ผู้ใช้งาน";

  // ตัด HTML และ Markdown ออกเพื่อแสดง Preview ข้อความสั้นๆ
  const plainText = (note.content || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[#*`>\-_~]/g, "")
    .trim();

  // ประเมินเวลาในการอ่าน
  const readingTime = Math.max(1, Math.ceil((plainText.length || 100) / 350));

  const isImageAttachment =
    note.file_path && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(note.file_path);
  const isPdfAttachment = note.file_path && /\.pdf$/i.test(note.file_path);

  const getRankBadge = (r: number) => {
    if (r === 1) {
      return (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-[11px] border border-amber-200">
          <Trophy className="w-3.5 h-3.5 fill-slate-950" />
          <span>#1 ยอดนิยม</span>
        </div>
      );
    }
    if (r === 2) {
      return (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800 font-black text-[11px] border border-slate-300">
          <span>🥈 อันดับ 2</span>
        </div>
      );
    }
    if (r === 3) {
      return (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-700 to-amber-800 text-white font-black text-[11px] border border-amber-600">
          <span>🥉 อันดับ 3</span>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <article
        className={cn(
          "relative bg-white rounded-3xl border flex flex-col justify-between group overflow-hidden transition-colors",
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
          {/* Header Row: Category Badge, Reading Time & Date */}
          <div className="flex items-center justify-between gap-2 flex-wrap pr-16 sm:pr-0">
            <div className="flex items-center gap-2 flex-wrap">
              {note.category ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 text-white text-[11px] font-medium tracking-tight">
                  {note.category.name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-medium">
                  ทั่วไป
                </span>
              )}

              {note.status && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold border bg-slate-50 text-slate-600 border-slate-200">
                  {note.status}
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
                  {new Date(note.created_at).toLocaleDateString("th-TH", {
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

          {/* Note Title & Content Preview */}
          <Link
            href={`/share/note/${note.share_token}`}
            className="group/link block space-y-1.5 pt-1"
          >
            <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover/link:text-indigo-600 transition-colors line-clamp-2 leading-snug">
              {note.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 line-clamp-3 leading-relaxed">
              {plainText ||
                "ไม่มีเนื้อหาข้อความตัวอย่าง คลิกเพื่อเปิดดูบันทึกฉบับเต็ม"}
            </p>
          </Link>

          {/* Attachments preview pill if any */}
          {note.file_path && (
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
        </div>

        {/* Card Footer: Reactions, Comment count, Action button */}
        <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
          {/* Reaction Buttons */}
          <ReactionButtons
            noteId={note.id}
            initialLikeCount={note.likeCount}
            initialDislikeCount={note.dislikeCount}
            initialUserReaction={note.currentUserReaction}
            size="sm"
          />

          <div className="flex items-center gap-3">
            {/* Comment Counter */}
            <Link
              href={`/share/note/${note.share_token}#comments`}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors"
              title="ดูความคิดเห็น"
            >
              <MessageCircle className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
              <span>{note.commentCount}</span>
            </Link>

            {/* Read More Link Button */}
            <Link
              href={`/share/note/${note.share_token}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              <span>อ่านฉบับเต็ม</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </article>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />
    </>
  );
}
