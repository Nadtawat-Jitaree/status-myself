import { Suspense } from "react";
import Notes from "../notes";
import { getNotesPageData } from "@/app/actions/notes";

export const metadata = {
  title: "Notes | ปัวเอนเจ PUANJ",
  description: "ระบบบันทึกข้อมูลใช้งานส่วนตัว",
  keywords: "Note บันทึกข้อมูล",
  openGraph: {
    title: "Notes | ปัวเอนเจ PUANJ",
    description: "ระบบบันทึกข้อมูลใช้งานส่วนตัว",
    url: "https://puanj.com/notes/normal",
    siteName: "Notes | ปัวเอนเจ PUANJ",
    images: [
      {
        url: "",
        width: 1200,
        height: 630,
        alt: "รูปปก",
      },
    ],
    locale: "th_TH",
    type: "website",
  },
  alternates: {
    canonical: "https://puanj.com/notes/normal",
  },
};

function NotesSkeleton() {
  return (
    <div className="flex justify-center items-center h-64 p-8">
      <div className="animate-spin h-8 w-8 rounded-full border-4 border-slate-800 border-t-transparent" />
    </div>
  );
}

async function NormalNotesContent() {
  const initialData = await getNotesPageData("normal").catch(() => null);
  return <Notes noteType="normal" initialData={initialData} />;
}

export default function NormalNotesPage() {
  return (
    <Suspense fallback={<NotesSkeleton />}>
      <NormalNotesContent />
    </Suspense>
  );
}
