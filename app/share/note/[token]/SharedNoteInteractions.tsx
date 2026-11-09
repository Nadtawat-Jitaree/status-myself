"use client";

import React, { useState } from "react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { UserProfileModal, UserProfileData } from "@/components/UserProfileModal";
import { ReactionButtons } from "@/components/ReactionButtons";
import { CommentSection } from "@/components/CommentSection";
import Link from "next/link";
import { MessagesSquare, Share2, ArrowLeft, ExternalLink } from "lucide-react";
import Swal from "sweetalert2";

interface SharedNoteInteractionsProps {
  noteId: string;
  shareToken: string;
  initialLikeCount: number;
  initialDislikeCount: number;
  initialUserReaction?: "like" | "dislike" | null;
  author: UserProfileData | null;
  isLoggedIn: boolean;
}

export function SharedNoteInteractions({
  noteId,
  shareToken,
  initialLikeCount,
  initialDislikeCount,
  initialUserReaction,
  author,
  isLoggedIn,
}: SharedNoteInteractionsProps) {
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);

  const authorName = author?.display_name || author?.username || "ผู้เขียน";

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "คัดลอกลิงก์บันทึกแล้ว",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  return (
    <div className="pt-8 border-t border-slate-100 flex flex-col gap-6">
      {/* Author Card & Reaction Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Author info */}
        <div className="flex items-center gap-3">
          <AvatarDisplay
            avatarType={author?.avatar_type}
            avatarIcon={author?.avatar_icon}
            avatarUrl={author?.avatar_url}
            name={authorName}
            size="md"
            onClick={() => author && setSelectedUser(author)}
            className="cursor-pointer hover:ring-2 hover:ring-indigo-500 transition"
          />

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">เขียนโดย:</span>
              <button
                type="button"
                onClick={() => author && setSelectedUser(author)}
                className="text-sm font-bold text-slate-800 hover:text-indigo-600 transition flex items-center gap-1 text-left"
              >
                <span>{authorName}</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </button>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              @{author?.username || "author"}
            </span>
          </div>
        </div>

        {/* Reaction Buttons & Share */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <ReactionButtons
            noteId={noteId}
            initialLikeCount={initialLikeCount}
            initialDislikeCount={initialDislikeCount}
            initialUserReaction={initialUserReaction}
            size="md"
          />

          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            title="แชร์ลิงก์นี้"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation back to Discussion Board */}
      <div className="flex items-center justify-between text-xs">
        <Link
          href="/board"
          className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปยังกระดานสนทนา</span>
        </Link>
      </div>

      {/* Comments Section */}
      <div id="comments" className="scroll-mt-20">
        <CommentSection noteId={noteId} isLoggedIn={isLoggedIn} />
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />
    </div>
  );
}
