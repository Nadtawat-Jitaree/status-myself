import { Suspense } from "react";
import Notes from "../notes";
import { getNotesPageData } from "@/app/actions/notes";

export const metadata = {
  title: "School Notes | ปัวเอนเจ PUANJ",
  description: "ระบบบันทึกการเรียนมหาวิทยาลัย",
};

function NotesSkeleton() {
  return (
    <div className="flex justify-center items-center h-64 p-8">
      <div className="animate-spin h-8 w-8 rounded-full border-4 border-slate-800 border-t-transparent" />
    </div>
  );
}

async function SchoolNotesContent() {
  const initialData = await getNotesPageData("school").catch(() => null);
  return <Notes noteType="school" initialData={initialData} />;
}

export default function SchoolNotesPage() {
  return (
    <Suspense fallback={<NotesSkeleton />}>
      <SchoolNotesContent />
    </Suspense>
  );
}
