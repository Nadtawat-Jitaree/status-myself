"use client";

import React from "react";
import { BoardNoteItem } from "@/app/actions/board";
import { BoardNoteCard } from "./BoardNoteCard";
import { Trophy, Flame, Sparkles } from "lucide-react";

interface TopBoardSectionProps {
  topNotes: BoardNoteItem[];
}

export function TopBoardSection({ topNotes }: TopBoardSectionProps) {
  if (!topNotes || topNotes.length === 0) return null;

  return (
    <section className="w-full mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Trophy className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Top Board ยอดนิยม</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/50">
                <Flame className="w-3 h-3 fill-rose-500" /> ยอดไลค์สูงสุด
              </span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            3 อันดับโน้ตที่ได้รับคะแนนความชื่นชอบและมีผู้สนใจมากที่สุดในระบบ
          </p>
        </div>
      </div>

      {/* Top 3 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {topNotes.slice(0, 3).map((note, index) => (
          <BoardNoteCard key={note.id} note={note} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}
