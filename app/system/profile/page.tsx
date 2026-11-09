import { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUserProfile } from "@/app/actions/profile";
import { ProfileFormClient } from "./ProfileFormClient";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "แก้ไขโปรไฟล์ผู้ใช้งาน | NJ Notes",
  description: "จัดการชื่อ รูปภาพโปรไฟล์ และช่องทางการติดต่อโซเชียลมีเดีย",
};

async function ProfileContent() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/auth/login?next=/system/profile");
  }

  return <ProfileFormClient initialProfile={profile} />;
}

function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8 animate-pulse">
      <div className="h-8 bg-slate-200 rounded-lg w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="h-64 bg-slate-200 rounded-3xl" />
        <div className="lg:col-span-2 space-y-6">
          <div className="h-32 bg-slate-200 rounded-3xl" />
          <div className="h-48 bg-slate-200 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
