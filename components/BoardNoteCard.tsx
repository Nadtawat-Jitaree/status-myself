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

  const isImageAttachment = note.file_path && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(note.file_path);
  const isPdfAttachment = note.file_path && /\.pdf$/i.test(note.file_path);

  const getRankBadge = (r: number) => {
    if (r === 1) {
      return (
        <div className="absolute -top-3 -left-3 z-10 flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-900 font-extrabold text-xs shadow-md shadow-amber-400/30 border border-white">
          <span>🥇 อันดับ 1</span>
        </div>
      );
    }
    if (r === 2) {
      return (
        <div className="absolute -top-3 -left-3 z-10 flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-slate-300 via-gray-200 to-slate-400 text-slate-900 font-extrabold text-xs shadow-md border border-white">
          <span>🥈 อันดับ 2</span>
        </div>
      );
    }
    if (r === 3) {
      return (
        <div className="absolute -top-3 -left-3 z-10 flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white font-extrabold text-xs shadow-md border border-white">
          <span>🥉 อันดับ 3</span>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div
        className={cn(
          "relative bg-white rounded-3xl border transition-all duration-200 flex flex-col justify-between group overflow-hidden shadow-xs hover:shadow-md",
          rank === 1
            ? "border-amber-300 ring-2 ring-amber-400/20 bg-gradient-to-b from-amber-50/20 to-white"
            : rank === 2
            ? "border-slate-300 bg-gradient-to-b from-slate-50/30 to-white"
            : rank === 3
            ? "border-amber-700/30 bg-gradient-to-b from-orange-50/20 to-white"
            : "border-slate-200/80 hover:border-indigo-200"
        )}
      >
        {rank && getRankBadge(rank)}

        <div className="p-5 sm:p-6 flex flex-col gap-4">
          {/* Header Row: Category Badge & Status */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {note.category && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 text-white text-[11px] font-medium tracking-tight">
                  {note.category.name}
                </span>
              )}
              {note.status && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold border bg-slate-50 text-slate-600 border-slate-200">
                  {note.status}
                </span>
              )}
            </div>

            {/* Date */}
            <div className="flex items-center gap-1 text-[11px] text-slate-400 ml-auto">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {new Date(note.created_at).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          </div>

          {/* Author Info */}
          <div className="flex items-center gap-2.5">
            <AvatarDisplay
              avatarType={author?.avatar_type}
              avatarIcon={author?.avatar_icon}
              avatarUrl={author?.avatar_url}
              name={authorName}
              size="sm"
              onClick={() => author && setSelectedUser(author as UserProfileData)}
              className="cursor-pointer hover:ring-2 hover:ring-indigo-500 transition"
            />
            <div className="flex flex-col min-w-0">
              <button
                type="button"
                onClick={() => author && setSelectedUser(author as UserProfileData)}
                className="text-xs font-bold text-slate-800 hover:text-indigo-600 transition truncate text-left"
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
            className="group/link block space-y-1.5"
          >
            <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover/link:text-indigo-600 transition line-clamp-2 leading-snug">
              {note.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 line-clamp-3 leading-relaxed">
              {plainText || "ไม่มีเนื้อหาข้อความตัวอย่าง คลิกเพื่อเปิดดูบันทึกฉบับเต็ม"}
            </p>
          </Link>

          {/* Attachments preview pill if any */}
          {note.file_path && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              {isImageAttachment ? (
                <span className="inline-flex items-center gap-1 text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md font-medium">
                  <ImageIcon className="w-3 h-3" /> มีรูปภาพแนบ
                </span>
              ) : isPdfAttachment ? (
                <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md font-medium">
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
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 font-medium transition"
              title="ดูความคิดเห็น"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{note.commentCount}</span>
            </Link>

            {/* Read More */}
            <Link
              href={`/share/note/${note.share_token}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-xl transition"
            >
              <span>อ่าน</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />
    </>
  );
}
