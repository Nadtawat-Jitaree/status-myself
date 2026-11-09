import { Suspense } from "react";
import { getSharedNote } from "@/app/actions/share";
import Image from "next/image";
import Link from "next/link";
import {
  FileText,
  Image as ImageIcon,
  Download,
  Calendar,
  Lock,
} from "lucide-react";
import CopyButton from "./CopyButton";
import NoteContentRenderer from "@/components/NoteContentRenderer";

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;
  const note = await getSharedNote(token);

  if (!note) {
    return {
      title: "ไม่พบบันทึกที่แชร์ | NJ Notes",
      robots: { index: false, follow: false },
    };
  }

  const pageUrl = `https://notes.puanj.com/share/note/${token}`;
  const rawContent = note.content ?? "";
  // ตัด markdown/html tags ออก แล้วใช้เป็น description
  const plainText = rawContent
    .replace(/<[^>]*>/g, "")
    .replace(/[#*`>\-_~]/g, "")
    .trim();
  const description = plainText.slice(0, 155) || "บันทึกที่แชร์ผ่าน NJ Notes";
  const category = note.note_categories?.name ?? "บันทึก";
  const dateStr = new Date(note.created_at).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    title: `${note.title} | NJ Notes`,
    description,
    // ─── Canonical ──────────────────────────────────────────────────
    alternates: { canonical: pageUrl },
    // ─── Open Graph (Facebook, LINE, Discord, ฯลฯ) ─────────────────
    openGraph: {
      type: "article",
      url: pageUrl,
      title: note.title,
      description,
      siteName: "NJ Notes",
      locale: "th_TH",
      publishedTime: note.created_at,
      modifiedTime: note.updated_at,
      tags: [category, "บันทึก", "NJ"],
    },
    // ─── Twitter Card ───────────────────────────────────────────────
    twitter: {
      card: "summary",
      title: note.title,
      description,
      site: "@nj",
    },
    // ─── Robots ─────────────────────────────────────────────────────
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    // ─── Structured Data hint ───────────────────────────────────────
    other: {
      "article:section": category,
      "article:published_time": note.created_at,
      "article:modified_time": note.updated_at,
    },
  };
}

function NoteSkeleton() {
  return (
    <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-10 flex flex-col gap-6 animate-pulse">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 flex flex-col gap-6">
        <div className="h-6 bg-slate-200 rounded-md w-32" />
        <div className="h-10 bg-slate-200 rounded-lg w-2/3" />
        <div className="space-y-3 pt-4">
          <div className="h-4 bg-slate-200 rounded w-full" />
          <div className="h-4 bg-slate-200 rounded w-5/6" />
          <div className="h-4 bg-slate-200 rounded w-4/6" />
        </div>
      </div>
    </div>
  );
}

async function SharedNoteContent({ params }: PageProps) {
  const { token } = await params;
  const note = await getSharedNote(token);

  if (!note) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border shadow-sm text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            ไม่สามารถเข้าถึงบันทึกนี้ได้
          </h1>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            บันทึกนี้อาจถูกปิดการแชร์ ลิงก์หมดอายุ หรือถูกลบออกจากระบบแล้ว
          </p>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
          >
            กลับสู่หน้าหลัก
          </Link>
        </div>
      </main>
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const getAttachmentUrl = (filePath: string) => {
    return `${supabaseUrl}/storage/v1/object/public/note_attachments/${filePath}`;
  };

  const getLogoUrl = (picPath?: string | null) => {
    if (!picPath) return "";
    return `${supabaseUrl}/storage/v1/object/public/logo/${picPath}`;
  };

  const isImageFile = (path?: string | null) => {
    if (!path) return false;
    const ext = path.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext || "");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "สำคัญ":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "งานค้าง":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "เสร็จสิ้น":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // ─── JSON-LD Structured Data ────────────────────────────────────
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: note.title,
    description: note.content
      ? note.content.replace(/<[^>]*>/g, "").slice(0, 155)
      : "",
    datePublished: note.created_at,
    dateModified: note.updated_at,
    publisher: {
      "@type": "Organization",
      name: "NJ Notes",
      url: "https://notes.puanj.com",
    },
    url: `https://notes.puanj.com/share/note/${token}`,
    ...(note.note_categories?.name && {
      articleSection: note.note_categories.name,
    }),
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/note.webp"
            alt="Logo"
            width={32}
            height={32}
            className="object-contain"
            unoptimized
          />
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            NJ Notes
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium ml-1">
            แชร์สาธารณะ
          </span>
        </Link>
        <Link
          href="/auth/login"
          className="text-xs text-muted-foreground hover:text-foreground font-medium transition"
        >
          เข้าสู่ระบบ
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-10 flex flex-col gap-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 md:p-10 flex flex-col gap-6">
          {/* Header section */}
          <div className="flex flex-col gap-3 pb-6 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              {note.note_categories?.name && (
                <span className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1 rounded-lg text-xs font-medium">
                  {note.note_categories.pic && (
                    <img
                      src={getLogoUrl(note.note_categories.pic)}
                      alt="pic"
                      className="w-3.5 h-3.5 rounded object-cover"
                    />
                  )}
                  {note.note_categories.name}
                </span>
              )}
              <span
                className={`px-2.5 py-0.5 rounded-lg text-xs font-medium border ${getStatusColor(
                  note.status || "ทั่วไป",
                )}`}
              >
                {note.status || "ทั่วไป"}
              </span>

              <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {new Date(note.created_at).toLocaleDateString("th-TH", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  น.
                </span>
              </div>
            </div>

            <div className="flex items-start justify-between gap-4 mt-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {note.title}
              </h1>
              <CopyButton text={note.content || ""} />
            </div>
          </div>

          {/* Content */}
          <div className="text-slate-700 text-base sm:text-lg leading-relaxed font-sans min-h-[120px]">
            <NoteContentRenderer
              content={note.content}
              readOnly
              emptyText="ไม่มีเนื้อหา"
            />
          </div>

          {/* Attachment section */}
          {note.file_path && (
            <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  {isImageFile(note.file_path) ? (
                    <>
                      <ImageIcon className="w-4 h-4 text-sky-500" />
                      รูปภาพแนบ
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-red-500" />
                      เอกสารแนบ (PDF)
                    </>
                  )}
                </span>
                <a
                  href={getAttachmentUrl(note.file_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
                >
                  <Download className="w-3.5 h-3.5" /> เปิดในแท็บใหม่ / ดาวน์โหลด
                </a>
              </div>

              {isImageFile(note.file_path) ? (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 max-h-[600px] flex items-center justify-center">
                  <img
                    src={getAttachmentUrl(note.file_path)}
                    alt="รูปแนบ"
                    className="w-full h-auto max-h-[600px] object-contain"
                  />
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-red-100 bg-red-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        เอกสารแนบ PDF
                      </p>
                      <p className="text-xs text-slate-500">
                        คลิกเพื่อเปิดอ่านหรือดาวน์โหลดไฟล์
                      </p>
                    </div>
                  </div>
                  <a
                    href={getAttachmentUrl(note.file_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    ดาวน์โหลด
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-400 border-t bg-white">
        ระบบบันทึกข้อมูล PUANJ • แชร์ผ่านลิงก์สาธารณะ
      </footer>
    </div>
  );
}

export default function SharedNotePage({ params }: PageProps) {
  return (
    <Suspense fallback={<NoteSkeleton />}>
      <SharedNoteContent params={params} />
    </Suspense>
  );
}
