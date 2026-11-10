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
  Globe,
  Lock,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BoardFilterBarProps {
  currentSearch?: string;
  currentSort?: "latest" | "popular" | "comments";
  currentFilter?: "all" | "mine";
  currentShareStatus?: "all" | "shared" | "unshared";
  isLoggedIn?: boolean;
  totalCount: number;
}

export function BoardFilterBar({
  currentSearch = "",
  currentSort = "latest",
  currentFilter = "all",
  currentShareStatus = "all",
  isLoggedIn = false,
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
    filter?: string | null;
    shareStatus?: string | null;
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

    // อัปเดต filter (all vs mine)
    if (updates.filter !== undefined) {
      if (updates.filter && updates.filter !== "all") {
        params.set("filter", updates.filter);
      } else {
        params.delete("filter");
        // ถ้ากลับไปดูบอร์ดสาธารณะ ให้ลบ shareStatus ออกด้วย
        params.delete("shareStatus");
      }
    }

    // อัปเดต shareStatus (all, shared, unshared)
    if (updates.shareStatus !== undefined) {
      if (updates.shareStatus && updates.shareStatus !== "all") {
        params.set("shareStatus", updates.shareStatus);
      } else {
        params.delete("shareStatus");
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
    currentSearch ||
    (currentSort && currentSort !== "latest") ||
    (currentFilter && currentFilter !== "all") ||
    (currentShareStatus && currentShareStatus !== "all")
  );

  return (
    <div className={cn("w-full space-y-3 mb-8 transition-opacity duration-200", isPending && "opacity-90")}>
      {/* Loading Progress Bar Indicator (แสดงเมื่อมีการค้นหาหรือเปลี่ยนหน้า) */}
      {isPending && (
        <div className="w-full h-1 bg-indigo-100 overflow-hidden rounded-full animate-in fade-in duration-150">
          <div className="h-full bg-indigo-600 animate-pulse w-full" />
        </div>
      )}

      {/* แท็บสลับมุมมองระหว่างบอร์ดสาธารณะ และโน้ตของฉัน (เมื่อล็อกอิน) */}
      {isLoggedIn && (
        <div className="flex items-center gap-3 pb-1 flex-wrap">
          <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100/90 border border-slate-200">
            <button
              type="button"
              onClick={() => updateQuery({ filter: "all", shareStatus: "all" })}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                currentFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>บอร์ดสาธารณะ</span>
            </button>
            <button
              type="button"
              onClick={() => updateQuery({ filter: "mine" })}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                currentFilter === "mine"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <User className="w-3.5 h-3.5" />
              <span>โน้ตของฉัน (My Notes)</span>
            </button>
          </div>

          {/* Sub-filter สำหรับ "โน้ตของฉัน": แยกแชร์ และปิดแชร์ */}
          {currentFilter === "mine" && (
            <div className="inline-flex items-center p-1 rounded-2xl bg-indigo-50/80 border border-indigo-100 animate-in fade-in duration-200">
              <span className="text-[11px] font-bold text-indigo-900/60 px-2.5">
                สถานะ:
              </span>
              <button
                type="button"
                onClick={() => updateQuery({ shareStatus: "all" })}
                className={cn(
                  "px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                  currentShareStatus === "all"
                    ? "bg-white text-indigo-950 shadow-xs border border-indigo-200/60"
                    : "text-indigo-700/80 hover:text-indigo-950"
                )}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => updateQuery({ shareStatus: "shared" })}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                  currentShareStatus === "shared"
                    ? "bg-sky-500 text-white shadow-xs"
                    : "text-indigo-700/80 hover:text-indigo-950"
                )}
              >
                <Globe className="w-3 h-3" />
                <span>เปิดแชร์อยู่</span>
              </button>
              <button
                type="button"
                onClick={() => updateQuery({ shareStatus: "unshared" })}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                  currentShareStatus === "unshared"
                    ? "bg-slate-700 text-white shadow-xs"
                    : "text-indigo-700/80 hover:text-indigo-950"
                )}
              >
                <Lock className="w-3 h-3" />
                <span>ปิดแชร์อยู่</span>
              </button>
            </div>
          )}
        </div>
      )}

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
            disabled={isPending}
            className="w-full pl-11 pr-28 py-2.5 sm:py-3 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-75 transition-colors"
          />
          {searchInput && !isPending && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-24 p-1 text-slate-400 hover:text-slate-600 transition-colors"
              title="ล้างข้อความ"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="absolute right-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-400 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            {isPending && (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{isPending ? "ค้นหา..." : "ค้นหา"}</span>
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
            {currentFilter === "mine" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 font-medium border border-indigo-200">
                <User className="w-3 h-3" /> โน้ตของคุณ
                <button
                  type="button"
                  onClick={() => updateQuery({ filter: "all", shareStatus: "all" })}
                  className="text-indigo-400 hover:text-indigo-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {currentFilter === "mine" && currentShareStatus !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 font-medium border border-sky-200">
                {currentShareStatus === "shared" ? (
                  <>
                    <Globe className="w-3 h-3 text-sky-600" />
                    <span>เปิดแชร์อยู่</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-slate-600" />
                    <span>ปิดแชร์อยู่</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => updateQuery({ shareStatus: "all" })}
                  className="text-sky-400 hover:text-sky-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
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
