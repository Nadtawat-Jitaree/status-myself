"use client";

import React, { useState, useTransition } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { toggleNoteReaction } from "@/app/actions/board";
import { cn } from "@/lib/utils";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

interface ReactionButtonsProps {
  noteId: string;
  initialLikeCount: number;
  initialDislikeCount: number;
  initialUserReaction?: "like" | "dislike" | null;
  className?: string;
  size?: "sm" | "md";
}

export function ReactionButtons({
  noteId,
  initialLikeCount,
  initialDislikeCount,
  initialUserReaction,
  className,
  size = "md",
}: ReactionButtonsProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(
    initialUserReaction || null
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleReaction = async (type: "like" | "dislike", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic Update
    const prevReaction = userReaction;
    const prevLikes = likeCount;
    const prevDislikes = dislikeCount;

    if (userReaction === type) {
      // Toggle off
      setUserReaction(null);
      if (type === "like") setLikeCount((prev) => Math.max(0, prev - 1));
      else setDislikeCount((prev) => Math.max(0, prev - 1));
    } else {
      // Switch or new
      if (type === "like") {
        setLikeCount((prev) => prev + 1);
        if (prevReaction === "dislike") {
          setDislikeCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        setDislikeCount((prev) => prev + 1);
        if (prevReaction === "like") {
          setLikeCount((prev) => Math.max(0, prev - 1));
        }
      }
      setUserReaction(type);
    }

    startTransition(async () => {
      try {
        await toggleNoteReaction(noteId, type);
      } catch (err: any) {
        // Rollback
        setUserReaction(prevReaction);
        setLikeCount(prevLikes);
        setDislikeCount(prevDislikes);

        const errorMsg = err?.message || "";
        if (errorMsg.includes("เข้าสู่ระบบ")) {
          const res = await Swal.fire({
            title: "กรุณาเข้าสู่ระบบ",
            text: "คุณต้องเข้าสู่ระบบเพื่อกดถูกใจหรือแสดงความเห็นในโน้ต",
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "เข้าสู่ระบบ",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#4f46e5",
          });
          if (res.isConfirmed) {
            router.push("/auth/login");
          }
        } else {
          Swal.fire({
            title: "เกิดข้อผิดพลาด",
            text: errorMsg || "ไม่สามารถทำรายการได้",
            icon: "error",
            timer: 2000,
          });
        }
      }
    });
  };

  const isSmall = size === "sm";

  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Like Button */}
      <button
        type="button"
        disabled={isPending}
        onClick={(e) => handleReaction("like", e)}
        title="กดชอบโน้ตนี้"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl font-medium transition-all active:scale-95",
          isSmall
            ? "px-2.5 py-1 text-xs"
            : "px-3 py-1.5 text-xs sm:text-sm",
          userReaction === "like"
            ? "bg-rose-500 text-white shadow-xs shadow-rose-500/30 font-semibold"
            : "bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600"
        )}
      >
        <ThumbsUp
          className={cn(
            isSmall ? "w-3.5 h-3.5" : "w-4 h-4",
            userReaction === "like" && "fill-current"
          )}
        />
        <span>{likeCount}</span>
      </button>

      {/* Dislike Button */}
      <button
        type="button"
        disabled={isPending}
        onClick={(e) => handleReaction("dislike", e)}
        title="ไม่ชอบโน้ตนี้"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl font-medium transition-all active:scale-95",
          isSmall
            ? "px-2 py-1 text-xs"
            : "px-2.5 py-1.5 text-xs sm:text-sm",
          userReaction === "dislike"
            ? "bg-slate-700 text-white shadow-xs font-semibold"
            : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800"
        )}
      >
        <ThumbsDown
          className={cn(
            isSmall ? "w-3.5 h-3.5" : "w-4 h-4",
            userReaction === "dislike" && "fill-current"
          )}
        />
        <span>{dislikeCount}</span>
      </button>
    </div>
  );
}
