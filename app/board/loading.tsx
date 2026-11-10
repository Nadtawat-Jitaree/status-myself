import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MessagesSquare, FileText, Heart } from "lucide-react";

export default function BoardLoading() {
  return (
    <div className="min-h-screen bg-slate-50/30 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* Hero Banner */}
      <section className="bg-white border-b border-slate-200 py-10 sm:py-14 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-4">
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            กระดานสนทนา
          </h1>

          <p className="text-xs sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            พื้นที่แลกเปลี่ยนและแบ่งปันโน้ต บทความ และสาระน่ารู้จากสมาชิกทุกคนบน NJ Notes
            ร่วมอ่าน กดถูกใจ ส่งต่อไอเดีย และสร้างสังคมการเรียนรู้ร่วมกัน
          </p>

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

      {/* Main Skeleton Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
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
      </main>

      <Footer variant="system" />
    </div>
  );
}
