"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  NoteCommentItem,
  getNoteComments,
  addNoteComment,
  deleteNoteComment,
} from "@/app/actions/board";
import { AvatarDisplay } from "./AvatarDisplay";
import { UserProfileModal, UserProfileData } from "./UserProfileModal";
import { Send, Trash2, MessageCircle, CornerDownRight } from "lucide-react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

interface CommentSectionProps {
  noteId: string;
  isLoggedIn?: boolean;
}

export function CommentSection({
  noteId,
  isLoggedIn = false,
}: CommentSectionProps) {
  const [comments, setComments] = useState<NoteCommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, startTransition] = useTransition();
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const router = useRouter();

  const fetchComments = async () => {
    try {
      const data = await getNoteComments(noteId);
      setComments(data);
    } catch (err) {
      console.error("Fetch comments error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [noteId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!isLoggedIn) {
      Swal.fire({
        title: "กรุณาเข้าสู่ระบบ",
        text: "คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถร่วมแสดงความคิดเห็นได้",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "เข้าสู่ระบบ",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#4f46e5",
      }).then((res) => {
        if (res.isConfirmed) router.push("/auth/login");
      });
      return;
    }

    const contentToSend = newComment.trim();
    setNewComment("");

    startTransition(async () => {
      try {
        const res = await addNoteComment(noteId, contentToSend);
        if (res?.comment) {
          // อัปเดต UI ทันทีไม่ต้องรอ fetchComments() ข้าม Network
          setComments((prev) => [
            ...prev,
            {
              id: res.comment.id,
              note_id: res.comment.note_id,
              user_id: res.comment.user_id,
              content: res.comment.content,
              created_at: res.comment.created_at,
              updated_at: res.comment.updated_at,
              author: {
                id: res.comment.user_id,
                username: "ฉัน",
                display_name: "ฉัน",
                avatar_type: "icon",
                avatar_icon: "User",
              },
              isOwner: true,
            },
          ]);
        }
        await fetchComments();
      } catch (err: any) {
        Swal.fire("ข้อผิดพลาด", err?.message || "ไม่สามารถส่งความคิดเห็นได้", "error");
        setNewComment(contentToSend);
      }
    });
  };

  const handleDelete = async (commentId: string) => {
    const res = await Swal.fire({
      title: "ลบความคิดเห็น?",
      text: "คุณแน่ใจหรือไม่ว่าต้องการลบความคิดเห็นนี้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ef4444",
    });

    if (res.isConfirmed) {
      try {
        await deleteNoteComment(commentId);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } catch (err: any) {
        Swal.fire("ข้อผิดพลาด", err?.message || "ไม่สามารถลบความคิดเห็นได้", "error");
      }
    }
  };

  return (
    <div className="w-full flex flex-col gap-5 pt-6 border-t border-slate-100">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-indigo-600" />
          <span>ความคิดเห็น</span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
            {comments.length}
          </span>
        </h3>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-2.5 items-start">
        <div className="flex-1 relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              isLoggedIn
                ? "พิมพ์ความคิดเห็นของคุณที่นี่..."
                : "เข้าสู่ระบบเพื่อร่วมแสดงความคิดเห็น..."
            }
            rows={2}
            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !newComment.trim()}
          className="h-10 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition active:scale-95 shrink-0 shadow-sm shadow-indigo-500/20"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">ส่ง</span>
        </button>
      </form>

      {/* Comments List */}
      <div className="space-y-3.5 mt-2">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-100 animate-pulse flex gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center rounded-2xl bg-slate-50/60 border border-dashed border-slate-200 text-xs text-slate-400">
            ยังไม่มีความคิดเห็น มาร่วมเป็นคนแรกที่แสดงความคิดเห็นกันเถอะ!
          </div>
        ) : (
          comments.map((comment) => {
            const author = comment.author;
            const authorName =
              author?.display_name || author?.username || "ผู้ใช้งาน";

            return (
              <div
                key={comment.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 shadow-xs transition flex gap-3 group"
              >
                {/* Author Avatar - Clickable */}
                <AvatarDisplay
                  avatarType={author?.avatar_type}
                  avatarIcon={author?.avatar_icon}
                  avatarUrl={author?.avatar_url}
                  name={authorName}
                  size="sm"
                  onClick={() => author && setSelectedUser(author as UserProfileData)}
                  className="cursor-pointer hover:ring-2 hover:ring-indigo-400 transition"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        author && setSelectedUser(author as UserProfileData)
                      }
                      className="text-xs font-bold text-slate-900 hover:text-indigo-600 transition truncate text-left"
                    >
                      {authorName}
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">
                        {new Date(comment.created_at).toLocaleDateString(
                          "th-TH",
                          {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>

                      {comment.isOwner && (
                        <button
                          type="button"
                          onClick={() => handleDelete(comment.id)}
                          title="ลบความคิดเห็นนี้"
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
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
