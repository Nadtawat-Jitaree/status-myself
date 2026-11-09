import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  getBoardNotes,
  getTopBoardNotes,
  getBoardStats,
} from "@/app/actions/board";
import { TopBoardSection } from "@/components/TopBoardSection";
import { BoardNoteCard } from "@/components/BoardNoteCard";
import { BoardFilterBar } from "@/components/BoardFilterBar";
import { NavbarLeft } from "@/components/navbar-left";
import { NavbarRight } from "@/components/navbar-right";
import { EnvVarWarning } from "@/components/env-var-warning";
import { Footer } from "@/components/footer";
import { hasEnvVars } from "@/lib/utils";
import {
  MessagesSquare,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  PlusCircle,
  FileText,
  Heart,
} from "lucide-react";

export const metadata: Metadata = {
  title: "กระดานสนทนาและคลังบันทึกความรู้ (Discussion Board) | NJ Notes",
  description:
    "พื้นที่แบ่งปันความคิด บันทึกความรู้ บทความ และสาระน่ารู้จากสมาชิกทุกคนบน NJ Notes พร้อมร่วมกดถูกใจและแลกเปลี่ยนความคิดเห็น",
  alternates: {
    canonical: "https://notes.puanj.com/board",
  },
  openGraph: {
    type: "website",
    url: "https://notes.puanj.com/board",
    title: "กระดานสนทนาและคลังบันทึกความรู้ | NJ Notes",
    description:
      "รวมบทความและบันทึกความรู้ที่เปิดแชร์สาธารณะ ค้นหา แลกเปลี่ยนมุมมอง และแสดงความคิดเห็น",
    siteName: "NJ Notes",
  },
};

interface BoardPageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: "latest" | "popular" | "comments";
  }>;
}

async function BoardContent({ searchParams }: BoardPageProps) {
  const resolvedParams = await searchParams;
  const currentPage = Math.max(1, parseInt(resolvedParams.page || "1", 10));
  const searchQuery = (resolvedParams.q || "").trim();
  const sortParam = resolvedParams.sort || "latest";

  // ดึงข้อมูลโน้ต, สถิติ, และ Top 3 Notes พร้อมกันแบบ Parallel
  const [boardData, topNotes, stats] = await Promise.all([
    getBoardNotes({
      page: currentPage,
      limit: 9,
      search: searchQuery,
      sortBy: sortParam,
    }),
    getTopBoardNotes(),
    getBoardStats(),
  ]);

  const { notes, totalCount, totalPages } = boardData;

  // ฟังก์ชันสร้าง URL สำหรับ Pagination
  const buildPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    if (pageNumber > 1) params.set("page", pageNumber.toString());
    if (searchQuery) params.set("q", searchQuery);
    if (sortParam && sortParam !== "latest") params.set("sort", sortParam);
    const qs = params.toString();
    return qs ? `/board?${qs}` : "/board";
  };

  const isDefaultView =
    currentPage === 1 && !searchQuery && sortParam === "latest";

  return (
    <>
      {/* Search & Sort Filter Bar */}
      <BoardFilterBar
        currentSearch={searchQuery}
        currentSort={sortParam}
        totalCount={totalCount}
      />

      {/* Top 3 Board Section (แสดงเฉพาะหน้าแรกเมื่อยังไม่ได้เปิดการกรองเฉพาะทาง) */}
      {isDefaultView && <TopBoardSection topNotes={topNotes} />}

      {/* Section Heading & Result Count */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <MessagesSquare className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>
                {searchQuery
                  ? `ผลการค้นหา "${searchQuery}"`
                  : sortParam === "popular"
                  ? "โน้ตยอดนิยมสูงสุด"
                  : sortParam === "comments"
                  ? "โน้ตที่มีการพูดคุยมากที่สุด"
                  : "โน้ตความรู้ล่าสุดทั้งหมด"}
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              พบทั้งหมด {totalCount} รายการ (หน้า {currentPage} จาก {totalPages})
            </p>
          </div>
        </div>

        {/* Quick clear link if any filter active */}
        {(!isDefaultView || currentPage > 1) && (
          <Link
            href="/board"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            ล้างตัวกรอง
          </Link>
        )}
      </div>

      {/* Grid 9 Items */}
      {notes.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800">
            ยังไม่พบบันทึกที่ตรงกับเงื่อนไข
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
            {searchQuery
              ? `ไม่พบบันทึกที่ตรงกับคำค้นหา "${searchQuery}" ลองปรับเปลี่ยนคำค้นหาใหม่อีกครั้ง`
              : "ยังไม่มีผู้ใช้เปิดแชร์โน้ตในขณะนี้ คุณสามารถเป็นคนแรกที่เปิดแชร์โน้ตจาก Workspace!"}
          </p>
          <div className="flex items-center gap-2.5 mt-2">
            {(searchQuery || sortParam !== "latest") && (
              <Link
                href="/board"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                ดูโน้ตทั้งหมด
              </Link>
            )}
            <Link
              href="/system/notes"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>เปิดแชร์โน้ตของคุณ</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <BoardNoteCard key={note.id} note={note} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-center gap-2 mt-12"
        >
          {/* Prev Button */}
          <Link
            href={buildPageUrl(Math.max(1, currentPage - 1))}
            className={`p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors ${
              currentPage <= 1 ? "pointer-events-none opacity-40" : ""
            }`}
            title="หน้าก่อนหน้า"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>

          {/* Page Number Pills */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            if (
              p === 1 ||
              p === totalPages ||
              (p >= currentPage - 1 && p <= currentPage + 1)
            ) {
              const isActive = currentPage === p;
              return (
                <Link
                  key={p}
                  href={buildPageUrl(p)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </Link>
              );
            }
            if (p === currentPage - 2 || p === currentPage + 2) {
              return (
                <span key={p} className="text-slate-400 px-1 text-xs">
                  ...
                </span>
              );
            }
            return null;
          })}

          {/* Next Button */}
          <Link
            href={buildPageUrl(Math.min(totalPages, currentPage + 1))}
            className={`p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors ${
              currentPage >= totalPages ? "pointer-events-none opacity-40" : ""
            }`}
            title="หน้าถัดไป"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </nav>
      )}
    </>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Filter Bar Skeleton */}
      <div className="h-12 bg-slate-200/70 rounded-2xl w-full" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 bg-slate-200/70 rounded-xl w-20" />
        ))}
      </div>

      {/* Top 3 Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-slate-200/80 rounded-3xl" />
        ))}
      </div>

      <div className="h-8 bg-slate-200 rounded-lg w-48" />

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-56 bg-slate-200/70 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

export default function BoardPage({ searchParams }: BoardPageProps) {
  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 bg-white sticky top-0 z-40">
        <div className="w-full max-w-7xl flex justify-between items-center p-2 sm:p-3 sm:px-5 text-sm">
          <div className="flex gap-2 sm:gap-5 items-center font-semibold">
            <Suspense
              fallback={
                <div className="w-10 h-10 animate-pulse bg-gray-200 rounded-xl"></div>
              }
            >
              <NavbarLeft />
            </Suspense>
          </div>

          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense
              fallback={
                <div className="w-20 h-8 animate-pulse bg-gray-200 rounded-md"></div>
              }
            >
              <NavbarRight />
            </Suspense>
          )}
        </div>
      </nav>

      {/* Hero Banner */}
      <section className="bg-white border-b border-slate-200 py-10 sm:py-14 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-4">
          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            กระดานสนทนา
          </h1>

          {/* Description */}
          <p className="text-xs sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            พื้นที่แลกเปลี่ยนและแบ่งปันโน้ต บทความ และสาระน่ารู้จากสมาชิกทุกคนบน NJ Notes
            ร่วมอ่าน กดถูกใจ ส่งต่อไอเดีย และสร้างสังคมการเรียนรู้ร่วมกัน
          </p>

          {/* Highlights / Quick Stats Pills */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap pt-2 text-[11px] sm:text-xs text-slate-600 font-medium">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>บันทึกความรู้สาธารณะ</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200">
              <MessagesSquare className="w-3.5 h-3.5 text-sky-600" />
              <span>แลกเปลี่ยนความคิดเห็น</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>ให้กำลังใจผู้สร้างสรรค์</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Board Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8">
        <Suspense fallback={<BoardSkeleton />}>
          <BoardContent searchParams={searchParams} />
        </Suspense>
      </main>

      <Footer variant="default" />
    </div>
  );
}
