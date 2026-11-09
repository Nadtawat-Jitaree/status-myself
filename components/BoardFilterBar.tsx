"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  X,
  Flame,
  Clock,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BoardFilterBarProps {
  currentSearch?: string;
  currentSort?: "latest" | "popular" | "comments";
  totalCount: number;
}

export function BoardFilterBar({
  currentSearch = "",
  currentSort = "latest",
  totalCount,
}: BoardFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(currentSearch);

  // อัปเดต URL Parameters โดยคงค่าพารามิเตอร์อื่นๆ ไว้
  const updateQuery = (updates: {
    q?: string | null;
    sort?: string | null;
    page?: number | null;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    // อัปเดต q
    if (updates.q !== undefined) {
      if (updates.q && updates.q.trim()) {
        params.set("q", updates.q.trim());
      } else {
        params.delete("q");
      }
    }

    // อัปเดต sort
    if (updates.sort !== undefined) {
      if (updates.sort && updates.sort !== "latest") {
        params.set("sort", updates.sort);
      } else {
        params.delete("sort");
      }
    }

    // รีเซ็ตหน้าเป็น 1 เสมอเมื่อเปลี่ยนเงื่อนไขค้นหาหรือจัดเรียง
    if (updates.page !== undefined) {
      if (updates.page && updates.page > 1) {
        params.set("page", updates.page.toString());
      } else {
        params.delete("page");
      }
    } else {
      params.delete("page");
    }

    startTransition(() => {
      const queryString = params.toString();
      router.push(queryString ? `/board?${queryString}` : "/board");
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuery({ q: searchInput });
  };

  const handleClearSearch = () => {
    setSearchInput("");
    updateQuery({ q: "" });
  };

  const handleResetAll = () => {
    setSearchInput("");
    startTransition(() => {
      router.push("/board");
    });
  };

  const hasActiveFilters = Boolean(
    currentSearch || (currentSort && currentSort !== "latest")
  );

  return (
    <div className="w-full space-y-3 mb-8">
      {/* แถบค้นหาและตัวเลือกการจัดเรียง */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* กล่องค้นหา */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1 flex items-center"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหาตามหัวข้อโน้ต, เนื้อหา, หรือคีย์เวิร์ด..."
            className="w-full pl-11 pr-24 py-2.5 sm:py-3 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-20 p-1 text-slate-400 hover:text-slate-600 transition-colors"
              title="ล้างข้อความ"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors"
          >
            ค้นหา
          </button>
        </form>

        {/* ปุ่ม Sort Segmented Controls */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 self-start sm:self-auto shrink-0 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => updateQuery({ sort: "latest" })}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap",
              currentSort === "latest"
                ? "bg-white text-slate-900 font-semibold border border-slate-200"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>ล่าสุด</span>
          </button>

          <button
            type="button"
            onClick={() => updateQuery({ sort: "popular" })}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap",
              currentSort === "popular"
                ? "bg-white text-rose-600 font-semibold border border-slate-200"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>ยอดนิยม</span>
          </button>

          <button
            type="button"
            onClick={() => updateQuery({ sort: "comments" })}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap",
              currentSort === "comments"
                ? "bg-white text-indigo-600 font-semibold border border-slate-200"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>คอมเมนต์เยอะ</span>
          </button>
        </div>
      </div>

      {/* แถบสรุปเงื่อนไขที่เลือก (เมื่อมีการค้นหาหรือเลือกเรียงลำดับ) */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between text-xs bg-indigo-50/50 border border-indigo-100 rounded-2xl px-3.5 py-2">
          <div className="flex items-center gap-2 flex-wrap text-slate-600">
            <span className="font-medium text-slate-700">กำลังแสดง:</span>
            {currentSearch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800">
                คำค้นหา: &quot;{currentSearch}&quot;
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {currentSort && currentSort !== "latest" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800">
                เรียงตาม:{" "}
                {currentSort === "popular"
                  ? "ยอดนิยม (Most Liked)"
                  : "ความคิดเห็น (Most Discussed)"}
                <button
                  type="button"
                  onClick={() => updateQuery({ sort: "latest" })}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <span className="text-slate-400">({totalCount} รายการ)</span>
          </div>

          <button
            type="button"
            onClick={handleResetAll}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors ml-auto shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>ล้างการค้นหา</span>
          </button>
        </div>
      )}
    </div>
  );
}
