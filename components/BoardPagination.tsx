import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { PaginationData } from "@/lib/pagination";
import { cn } from "@/lib/utils";

interface BoardPaginationProps {
  pagination: PaginationData;
  searchParams?: {
    q?: string;
    sort?: string;
    filter?: string;
    shareStatus?: string;
  };
  basePath?: string;
  className?: string;
}

export function BoardPagination({
  pagination,
  searchParams,
  basePath = "/board",
  className = "",
}: BoardPaginationProps) {
  const {
    currentPage,
    totalPages,
    hasPrevPage,
    hasNextPage,
    prevPage,
    nextPage,
    startIndex,
    endIndex,
    totalCount,
    items,
  } = pagination;

  if (totalPages <= 1) return null;

  const getPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    if (pageNumber > 1) params.set("page", pageNumber.toString());
    if (searchParams?.q?.trim()) params.set("q", searchParams.q.trim());
    if (searchParams?.sort && searchParams.sort !== "latest") params.set("sort", searchParams.sort);
    if (searchParams?.filter && searchParams.filter !== "all") params.set("filter", searchParams.filter);
    if (searchParams?.shareStatus && searchParams.shareStatus !== "all") {
      params.set("shareStatus", searchParams.shareStatus);
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-6 border-t border-slate-200/60",
        className
      )}
    >
      {/* รายละเอียดจำนวนรายการ */}
      <div className="text-xs text-slate-500 font-medium order-2 sm:order-1">
        แสดง <span className="font-semibold text-slate-700">{startIndex}</span> -{" "}
        <span className="font-semibold text-slate-700">{endIndex}</span> จากทั้งหมด{" "}
        <span className="font-semibold text-slate-700">{totalCount}</span> รายการ
      </div>

      {/* Navigation Controls */}
      <nav
        aria-label="Pagination"
        className="flex items-center justify-center gap-1.5 order-1 sm:order-2"
      >
        {/* First Page (เมื่อมีมากกว่า 5 หน้า) */}
        {totalPages > 5 && (
          <Link
            href={getPageUrl(1)}
            prefetch={true}
            className={cn(
              "p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors hidden sm:flex items-center justify-center",
              !hasPrevPage && "pointer-events-none opacity-30"
            )}
            title="หน้าแรก"
            aria-disabled={!hasPrevPage}
          >
            <ChevronsLeft className="w-4 h-4" />
          </Link>
        )}

        {/* Prev Page Button */}
        <Link
          href={getPageUrl(prevPage || 1)}
          prefetch={true}
          className={cn(
            "p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center",
            !hasPrevPage && "pointer-events-none opacity-30"
          )}
          title="หน้าก่อนหน้า"
          aria-disabled={!hasPrevPage}
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>

        {/* Page Pills */}
        <div className="flex items-center gap-1">
          {items.map((item) => {
            if (item.type === "ellipsis") {
              return (
                <span
                  key={item.key}
                  className="w-8 h-9 flex items-center justify-center text-slate-400 text-xs select-none"
                >
                  •••
                </span>
              );
            }

            const pageNum = item.page!;
            const isActive = currentPage === pageNum;

            return (
              <Link
                key={item.key}
                href={getPageUrl(pageNum)}
                prefetch={true}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "min-w-9 h-9 px-2 flex items-center justify-center rounded-xl text-xs font-semibold transition-all duration-150",
                  isActive
                    ? "bg-slate-900 text-white shadow-xs scale-105 pointer-events-none"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 active:scale-95"
                )}
              >
                {pageNum}
              </Link>
            );
          })}
        </div>

        {/* Next Page Button */}
        <Link
          href={getPageUrl(nextPage || totalPages)}
          prefetch={true}
          className={cn(
            "p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center",
            !hasNextPage && "pointer-events-none opacity-30"
          )}
          title="หน้าถัดไป"
          aria-disabled={!hasNextPage}
        >
          <ChevronRight className="w-4 h-4" />
        </Link>

        {/* Last Page (เมื่อมีมากกว่า 5 หน้า) */}
        {totalPages > 5 && (
          <Link
            href={getPageUrl(totalPages)}
            prefetch={true}
            className={cn(
              "p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors hidden sm:flex items-center justify-center",
              !hasNextPage && "pointer-events-none opacity-30"
            )}
            title="หน้าสุดท้าย"
            aria-disabled={!hasNextPage}
          >
            <ChevronsRight className="w-4 h-4" />
          </Link>
        )}
      </nav>
    </div>
  );
}
