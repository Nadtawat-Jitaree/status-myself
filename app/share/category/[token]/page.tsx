import { Suspense } from "react";
import { getSharedCategory } from "@/app/actions/share";
import SharedCategoryView from "./SharedCategoryView";
import Link from "next/link";
import { Lock } from "lucide-react";

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;
  const result = await getSharedCategory(token);

  if (!result || !result.category) {
    return {
      title: "ไม่พบหมวดหมู่ที่แชร์ | NJ Notes",
      robots: { index: false, follow: false },
    };
  }

  const pageUrl = `https://notes.puanj.com/share/category/${token}`;
  const { category, notes } = result;
  const noteCount = notes.length;
  const description =
    category.description ||
    `รวม ${noteCount} บันทึกในหมวดหมู่ "${category.name}" — แชร์ผ่าน NJ Notes`;

  return {
    title: `${category.name} | NJ Notes`,
    description,
    // ─── Canonical ──────────────────────────────────────────────────
    alternates: { canonical: pageUrl },
    // ─── Open Graph ─────────────────────────────────────────────────
    openGraph: {
      type: "website",
      url: pageUrl,
      title: `${category.name} — หมวดหมู่บันทึก`,
      description,
      siteName: "NJ Notes",
      locale: "th_TH",
    },
    // ─── Twitter Card ───────────────────────────────────────────────
    twitter: {
      card: "summary",
      title: `${category.name} — หมวดหมู่บันทึก | NJ Notes`,
      description,
      site: "@nj",
    },
    // ─── Robots ─────────────────────────────────────────────────────
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  };
}

function CategorySkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-pulse">
      <div className="bg-white border-b py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-slate-200" />
          <div className="space-y-2 flex-1">
            <div className="h-7 bg-slate-200 rounded w-48" />
            <div className="h-4 bg-slate-200 rounded w-72" />
          </div>
        </div>
      </div>
      <div className="max-w-6xl w-full mx-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-44 bg-white rounded-2xl border p-5" />
        ))}
      </div>
    </div>
  );
}

async function SharedCategoryContent({ params }: PageProps) {
  const { token } = await params;
  const result = await getSharedCategory(token);

  if (!result || !result.category) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border shadow-sm text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            ไม่สามารถเข้าถึงหมวดหมู่นี้ได้
          </h1>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            หมวดหมู่นี้อาจถูกปิดการแชร์ หรือถูกลบออกจากระบบแล้ว
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

  return (
    <SharedCategoryView
      category={result.category}
      notes={result.notes}
      supabaseUrl={supabaseUrl}
    />
  );
}

export default function SharedCategoryPage({ params }: PageProps) {
  return (
    <Suspense fallback={<CategorySkeleton />}>
      <SharedCategoryContent params={params} />
    </Suspense>
  );
}
