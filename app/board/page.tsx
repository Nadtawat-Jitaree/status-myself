import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { getBoardNotes, getTopBoardNotes } from "@/app/actions/board";
import { TopBoardSection } from "@/components/TopBoardSection";
import { BoardNoteCard } from "@/components/BoardNoteCard";
import { NavbarRight } from "@/components/navbar-right";
import {
  MessagesSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  PlusCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "กระดานสนทนา (Discussion Board) | NJ Notes",
  description:
    "พื้นที่แบ่งปันความคิด บันทึกความรู้ บทความ และสาระน่ารู้จากสมาชิกทุกคนบน NJ Notes พร้อมร่วมกดถูกใจและแลกเปลี่ยนความคิดเห็น",
  alternates: {
    canonical: "https://notes.puanj.com/board",
  },
  openGraph: {
    type: "website",
    url: "https://notes.puanj.com/board",
    title: "กระดานสนทนา (Discussion Board) | NJ Notes",
    description:
      "รวมบทความและบันทึกความรู้ที่เปิดแชร์สาธารณะ ค้นหา แลกเปลี่ยนมุมมอง และแสดงความคิดเห็น",
    siteName: "NJ Notes",
  },
};

interface BoardPageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
  }>;
}

async function BoardContent({ searchParams }: BoardPageProps) {
  const resolvedParams = await searchParams;
  const currentPage = Math.max(1, parseInt(resolvedParams.page || "1", 10));
  const searchQuery = (resolvedParams.q || "").trim();

  // ดึงข้อมูลโน้ต 9 รายการต่อหน้า + Top 3 Notes พร้อมกัน
  const [boardData, topNotes] = await Promise.all([
    getBoardNotes({
      page: currentPage,
      limit: 9,
      search: searchQuery,
    }),
    getTopBoardNotes(),
  ]);

  const { notes, totalCount, totalPages } = boardData;

  return (
    <>
      {/* Top 3 Board Section (แสดงเฉพาะหน้าแรกเมื่อไม่มีคำค้นหา) */}
      {currentPage === 1 && !searchQuery && (
        <TopBoardSection topNotes={topNotes} />
      )}

      {/* Section Heading */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-600">
            <MessagesSquare className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {searchQuery ? `ผลการค้นหา "${searchQuery}"` : "โน้ตล่าสุดทั้งหมด"}
            </h2>
            <p className="text-xs text-slate-400">
              พบทั้งหมด {totalCount} รายการ (หน้า {currentPage} จาก {totalPages})
            </p>
          </div>
        </div>

        {searchQuery && (
          <Link
            href="/board"
            className="text-xs font-semibold text-indigo-600 hover:underline"
          >
            ล้างการค้นหา
          </Link>
        )}
      </div>

      {/* Grid 9 Items */}
      {notes.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8 flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            ยังไม่พบบันทึกที่แชร์
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {searchQuery
              ? `ไม่พบบันทึกที่ตรงกับคำค้นหา "${searchQuery}" ลองเปลี่ยนคำค้นหาดูอีกครั้ง`
              : "ยังไม่มีผู้ใช้เปิดแชร์โน้ตในขณะนี้ คุณสามารถเป็นคนแรกที่เปิดแชร์โน้ตจาก Workspace ได้!"}
          </p>
          <Link
            href="/system/notes"
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ไปที่บันทึกของฉัน</span>
          </Link>
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
        <div className="flex items-center justify-center gap-2 mt-10">
          {/* Prev Button */}
          <Link
            href={`/board?page=${Math.max(1, currentPage - 1)}${
              searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
            }`}
            className={`p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition ${
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
              return (
                <Link
                  key={p}
                  href={`/board?page=${p}${
                    searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
                  }`}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-semibold transition ${
                    currentPage === p
                      ? "bg-indigo-600 text-white shadow-xs"
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
            href={`/board?page=${Math.min(totalPages, currentPage + 1)}${
              searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
            }`}
            className={`p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition ${
              currentPage >= totalPages ? "pointer-events-none opacity-40" : ""
            }`}
            title="หน้าถัดไป"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-slate-200 rounded-3xl" />
        ))}
      </div>
      <div className="h-8 bg-slate-200 rounded-lg w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-56 bg-slate-200 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

export default function BoardPage({ searchParams }: BoardPageProps) {
  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-slate-50 p-1 border border-slate-200/70 shadow-xs">
              <Image
                src="/logo.png"
                alt="NJ Notes"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900 leading-none">
                NJ Notes
              </span>
              <span className="text-[10px] font-semibold text-indigo-600 leading-tight mt-0.5">
                กระดานสนทนา
              </span>
            </div>
          </Link>

          {/* Quick link to Workspace */}
          <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
            <Link
              href="/system/dashboard"
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              Workspace
            </Link>
            <Link
              href="/system/profile"
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              โปรไฟล์ของฉัน
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Suspense
            fallback={
              <div className="w-16 h-8 animate-pulse bg-slate-200 rounded-xl" />
            }
          >
            <NavbarRight />
          </Suspense>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-white via-indigo-50/20 to-transparent border-b border-slate-200/50 py-10 sm:py-14 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200/60 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Community Discussion Board</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-2xl">
            กระดานสนทนาและคลังบันทึกความรู้
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
            แหล่งรวมโน้ตและบทความที่แชร์จากทุกคน ร่วมอ่าน กดถูกใจ แลกเปลี่ยนความคิดเห็น
            และสร้างพื้นที่ความรู้ร่วมกัน
          </p>

          {/* Search Bar Form */}
          <form
            action="/board"
            method="GET"
            className="w-full max-w-lg mt-3 flex items-center relative"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-4" />
            <input
              type="text"
              name="q"
              placeholder="ค้นหาตามชื่อบันทึกหรือหัวข้อ..."
              className="w-full pl-11 pr-24 py-3 rounded-2xl border border-slate-200 bg-white text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            <button
              type="submit"
              className="absolute right-2 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
            >
              ค้นหา
            </button>
          </form>
        </div>
      </section>

      {/* Main Board Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8">
        <Suspense fallback={<BoardSkeleton />}>
          <BoardContent searchParams={searchParams} />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
        NJ Notes กระดานสนทนาสาธารณะ • ทุกบทความแชร์โดยสมาชิก
      </footer>
    </div>
  );
}
