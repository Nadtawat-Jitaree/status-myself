import type { Metadata } from "next";
import InstallPWAButton from "@/components/InstallPWAButton.js";

// ─── Page-level Metadata (overrides root layout's title template) ──
export const metadata: Metadata = {
  title: "NJ Notes — จดบันทึก จัดระเบียบความคิด ใช้ได้ทุกที่",
  description:
    "NJ Notes แอปจดบันทึกส่วนตัวที่เรียบง่ายและทรงพลัง จัดระเบียบความคิด บันทึกงาน โปรเจกต์ และตารางเรียน — ติดตั้งเป็น PWA ได้ทันที ใช้ได้บนมือถือและเดสก์ท็อป",
  alternates: {
    canonical: "https://notes.puanj.com",
  },
  openGraph: {
    type: "website",
    url: "https://notes.puanj.com",
    title: "NJ Notes — จดบันทึก จัดระเบียบความคิด",
    description:
      "แอปจดบันทึกส่วนตัวที่เรียบง่ายและทรงพลัง จัดระเบียบความคิด บันทึกงาน โปรเจกต์ และตารางเรียน",
    images: [
      {
        url: "/all.webp",
        width: 1200,
        height: 630,
        alt: "NJ Notes — หน้าหลัก",
      },
    ],
  },
};

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import NoteContentRenderer from "@/components/NoteContentRenderer";

const mockCategories = [
  {
    id: "cat-1",
    name: "Programming",
    pic: null,
  },
  {
    id: "cat-2",
    name: "Work",
    pic: null,
  },
  {
    id: "cat-3",
    name: "Personal",
    pic: null,
  },
  {
    id: "cat-4",
    name: "Ideas",
    pic: null,
  },
];

const mockNotes = [
  {
    id: "note-3",
    title: "ประชุมทีม",
    content:
      "เตรียมหัวข้อสำหรับประชุมทีม ได้แก่ ความคืบหน้าของโปรเจกต์ งานที่ต้องแก้ไข และแผนงานสำหรับสัปดาห์หน้า",
    status: "เสร็จสิ้น",
    created_at: "2026-09-15T10:00:00",
    note_categories: {
      id: "cat-2",
      name: "Work",
      pic: null,
    },
  },
  {
    id: "note-5",
    title: "สิ่งที่ต้องทำวันนี้",
    content:
      "แก้หน้า Dashboard, ตรวจสอบ Responsive บนมือถือ, ทดสอบ Login และ Deploy เวอร์ชันล่าสุด",
    status: "งานค้าง",
    created_at: "2026-09-17T08:15:00",
    note_categories: {
      id: "cat-2",
      name: "Work",
      pic: null,
    },
  },
];

const filterCategory = "all";
const searchQuery: string = "";

const currentPage = 1;
const ITEMS_PER_PAGE = 6;

const filteredNotes = mockNotes.filter((note) => {
  const matchCategory =
    filterCategory === "all" || note.note_categories?.id === filterCategory;

  const matchSearch =
    searchQuery === "" ||
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase());

  return matchCategory && matchSearch;
});

const paginatedNotes = filteredNotes.slice(
  (currentPage - 1) * ITEMS_PER_PAGE,
  currentPage * ITEMS_PER_PAGE,
);

const totalPages = Math.ceil(filteredNotes.length / ITEMS_PER_PAGE);

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-white text-black overflow-hidden">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="flex min-h-screen flex-col items-center w-full">
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.03] px-3.5 py-1.5 text-sm font-medium text-black mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black opacity-30" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-black" />
                </span>
                Simple. Fast. Organized.
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-black">
                Your thoughts,
                <br />
                <span className="text-black">organized.</span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl leading-relaxed text-black/55 max-w-xl">
                NJ Notes is a simple and powerful place to capture your ideas,
                notes, tasks, and important information — all in one place.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <InstallPWAButton />

                <a href="/system/dashboard">
                  <Button
                    className="
                      inline-flex items-center justify-center
                      text-sm px-5 py-3
                      rounded-2xl
                      border border-black/10
                      bg-white
                      text-black
                      hover:bg-black/[0.03]
                    "
                  >
                    เริ่มต้นใช้งาน
                  </Button>
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <div className="group flex items-center gap-2.5 rounded-full border border-black/10 bg-white px-3.5 py-2 transition-all duration-300 hover:border-black/20">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                    ✓
                  </span>
                  <span className="text-sm font-medium text-black/70">
                    Easy to use
                  </span>
                </div>

                <div className="group flex items-center gap-2.5 rounded-full border border-black/10 bg-white px-3.5 py-2 transition-all duration-300 hover:border-black/20">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                    ✓
                  </span>
                  <span className="text-sm font-medium text-black/70">
                    Connect all devices
                  </span>
                </div>

                <div className="group flex items-center gap-2.5 rounded-full border border-black/10 bg-white px-3.5 py-2 transition-all duration-300 hover:border-black/20">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                    ✓
                  </span>
                  <span className="text-sm font-medium text-black/70">
                    Install as app
                  </span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-black/[0.06] blur-3xl rounded-full scale-90" />

              <div
                className="
                  relative
                  rounded-3xl
                  border border-black/10
                  bg-white
                  overflow-hidden
                  rotate-[1deg]
                  hover:rotate-0
                  transition-transform duration-500
                "
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-black/10" />
                    <div className="w-3 h-3 rounded-full bg-black/10" />
                    <div className="w-3 h-3 rounded-full bg-black/10" />
                  </div>

                  <div className="text-xs font-medium text-black/35">
                    NJ Notes
                  </div>

                  <div className="w-16" />
                </div>

                <div className="p-6 sm:p-8">
                  <div
                    className="
                      flex flex-col gap-4
                      border
                      rounded-3xl
                      px-5 py-6
                      bg-slate-50/30
                      bg-[url('/all.webp')]
                      bg-contain
                      bg-center
                      bg-no-repeat
                    "
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <h2 className="text-xl font-bold">รายการบันทึก</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="
                            h-9 gap-2
                            bg-orange-100
                            text-orange-800
                            border-orange-300
                            hover:bg-orange-200
                          "
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11ZM8 4a.75.75 0 0 0-.75.75v3.5c0 .2.08.39.22.53l2.5 2.5a.75.75 0 0 0 1.06-1.06l-2.23-2.23V4.75A.75.75 0 0 0 8 4Z" />
                        </svg>
                        แสดงเฉพาะงานค้าง
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="
                            h-9 gap-2
                            bg-green-100
                            text-green-800
                            border-green-300
                            hover:bg-green-200
                          "
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        รายการที่เสร็จสิ้น
                      </Button>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium whitespace-nowrap">
                          หมวดหมู่
                        </span>

                        <Button
                          type="button"
                          variant="outline"
                          className="
                              flex h-9
                              w-[100px] md:w-[180px]
                              justify-between
                              px-3
                              text-sm
                              bg-white
                              font-normal
                            "
                        >
                          <span className="truncate">ทั้งหมด (All)</span>

                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            className="w-4 h-4 opacity-50"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end text-end w-full">
                      <div className="relative w-full">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="
                            w-4 h-4
                            absolute
                            left-3
                            top-1/2
                            -translate-y-1/2
                            text-slate-400
                          "
                        >
                          <path
                            fillRule="evenodd"
                            d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                            clipRule="evenodd"
                          />
                        </svg>

                        <Input
                          type="text"
                          placeholder="ค้นหาชื่อหรือเนื้อหาโน้ต..."
                          readOnly
                          className="pl-9 h-9 bg-white/80"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mt-2">
                      {paginatedNotes.length === 0 ? (
                        <p className="text-muted-foreground col-span-full text-center py-12 border-2 border-dashed rounded-xl">
                          ไม่พบโน้ตในหมวดหมู่นี้ หรือยังไม่มีโน้ตเลย
                        </p>
                      ) : (
                        paginatedNotes.map((note, index) => (
                          <Card
                            key={note.id}
                            className="
                              flex flex-col
                              h-full
                              relative
                              group
                              transition-all
                              duration-300
                              overflow-hidden
                              bg-white
                              border-black/10
                              hover:-translate-y-1
                              hover:border-black/20
                            "
                          >
                            <div
                              className="
                              absolute
                              top-0
                              left-0
                              bg-black/[0.06]
                              text-black/60
                              px-2
                              py-0.5
                              rounded-br-lg
                              text-xs
                              font-bold
                              z-10
                            "
                            >
                              #{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                            </div>
                            <CardHeader className="pb-2 pt-8">
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-xl pr-2">
                                  {note.title}
                                </CardTitle>
                              </div>

                              <CardDescription className="flex flex-wrap gap-2 items-center mt-2">
                                <span
                                  className={`
                                    inline-flex
                                    items-center
                                    px-2
                                    py-0.5
                                    rounded
                                    text-xs
                                    font-medium
                                    ${
                                      note.status === "งานค้าง"
                                        ? "bg-orange-100 text-orange-800"
                                        : note.status === "สำคัญ"
                                          ? "bg-red-100 text-red-800"
                                          : note.status === "เสร็จสิ้น"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-slate-100 text-slate-700"
                                    }
                                  `}
                                >
                                  {note.status}
                                </span>

                                {note.note_categories?.name && (
                                  <span
                                    className="
                                    inline-flex
                                    items-center
                                    gap-1.5
                                    bg-slate-800
                                    text-white
                                    px-2
                                    py-0.5
                                    rounded
                                    text-xs
                                  "
                                  >
                                    {note.note_categories.name}
                                  </span>
                                )}
                              </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-1 flex flex-col justify-between">
                              <div className="text-sm line-clamp-4 mb-4 text-black/65 overflow-hidden">
                                <NoteContentRenderer
                                  content={note.content}
                                  isCompact
                                  readOnly
                                />
                              </div>

                              <div
                                className="
                                flex
                                items-center
                                gap-1.5
                                text-xs
                                text-black/40
                                mt-auto
                                pt-4
                                border-t
                                border-black/5
                              "
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 16 16"
                                  fill="currentColor"
                                  className="w-3.5 h-3.5"
                                >
                                  <path d="M4.75 2.25a.75.75 0 0 0-1.5 0v1.41l-.146.126a1.5 1.5 0 0 0-.604 1.196v6.268a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V4.982a1.5 1.5 0 0 0-.604-1.196l-.146-.126V2.25a.75.75 0 0 0-1.5 0v1h-5v-1ZM4 5.5h8v5.75a.25.25 0 0 1-.25.25h-7.5a.25.25 0 0 1-.25-.25V5.5Z" />
                                </svg>

                                <span>
                                  {new Date(note.created_at).toLocaleDateString(
                                    "th-TH",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>

                    {totalPages > 1 && (
                      <div
                        className="
                        flex
                        justify-center
                        items-center
                        gap-4
                        mt-6
                      "
                      >
                        <Button variant="outline" disabled>
                          ก่อนหน้า
                        </Button>

                        <span className="text-sm font-medium text-slate-600">
                          หน้า {currentPage} จาก {totalPages}
                        </span>

                        <Button variant="outline" disabled>
                          ถัดไป
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="
                absolute
                -bottom-6
                -left-5
                sm:-left-10
                rounded-2xl
                border
                border-black/10
                bg-white
                px-4
                py-3
                flex
                items-center
                gap-3
              "
              >
                <div
                  className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-black
                  text-white
                "
                >
                  ✓
                </div>

                <div>
                  <p className="text-sm font-semibold text-black/80">
                    Stay organized
                  </p>

                  <p className="text-xs text-black/40">Your notes, anytime.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="
          w-full
          border-t
          border-black/10
          bg-black/[0.015]
        "
        >
          <div
            className="
            max-w-7xl
            mx-auto
            px-4
            sm:px-6
            py-16
          "
          >
            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard
                icon="✦"
                title="Capture Everything"
                description="Quickly save ideas, information, tasks, and anything you want to remember."
              />

              <FeatureCard
                icon="⌕"
                title="Find It Fast"
                description="Keep your notes organized and make important information easy to find."
              />

              <FeatureCard
                icon="↗"
                title="Use Anywhere"
                description="Install NJ Notes as an app and access your notes whenever you need them."
              />
            </div>
          </div>
        </section>

        <footer
          className="
          w-full
          border-t
          border-black/10
          bg-white
        "
        >
          <div
            className="
            max-w-7xl
            mx-auto
            px-4
            sm:px-6
            py-8
            flex
            flex-col
            sm:flex-row
            justify-between
            items-center
            gap-3
          "
          >
            <div className="font-semibold text-black">NJ Notes</div>

            <p className="text-sm text-black/40">
              Simple notes. Clear thoughts.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className="
        group
        rounded-2xl
        border
        border-black/10
        bg-white
        p-6
      
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-black/20
      "
    >
      <div
        className="
        flex
        h-11
        w-11
        items-center
        justify-center
        rounded-xl
        bg-black
        text-white
        text-lg
        font-semibold
        transition-colors
        group-hover:bg-black/80
      "
      >
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-semibold text-black">{title}</h3>

      <p className="mt-2 text-sm leading-relaxed text-black/50">
        {description}
      </p>
    </div>
  );
}
