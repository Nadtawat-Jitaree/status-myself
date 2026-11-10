"use client";

import React from "react";
import { BoardNoteItem } from "@/app/actions/board";
import { BoardNoteCard } from "./BoardNoteCard";
import { Trophy, Flame } from "lucide-react";

interface TopBoardSectionProps {
  topNotes: BoardNoteItem[];
}

export function TopBoardSection({ topNotes }: TopBoardSectionProps) {
  if (!topNotes || topNotes.length === 0) return null;

  return (
    <section className="w-full mb-12 relative">
      {/* Background container */}
      <div className="rounded-3xl p-5 sm:p-7 bg-amber-50/30 border border-amber-200/70">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-200/60">
                <Trophy className="w-5 h-5" />
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Top Board บันทึกยอดนิยม
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/70">
                  <Flame className="w-3.5 h-3.5 fill-rose-500" /> ชื่นชอบสูงสุด
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 pl-0.5">
              3 อันดับโน้ตและบทความที่ได้รับคะแนนความสนใจและการกดถูกใจมากที่สุดในระบบ
            </p>
          </div>

        </div>

        {/* Top 3 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
          {topNotes.slice(0, 3).map((note, index) => (
            <BoardNoteCard key={note.id} note={note} rank={index + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
