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
    <div className="container mx-auto px-4 sm:px-8 py-8 sm:py-9 max-w-5xl flex flex-col gap-8 border-2 rounded-3xl animate-pulse">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded-lg w-48" />
          <div className="h-4 bg-muted rounded-lg w-72" />
        </div>
        <div className="h-9 bg-muted rounded-md w-32" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="h-72 bg-muted rounded-xl" />
        <div className="lg:col-span-2 space-y-6">
          <div className="h-28 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
          <div className="h-44 bg-muted rounded-xl" />
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
