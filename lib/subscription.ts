import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole, SubscriptionInfo } from "./subscription-types";

export * from "./subscription-types";

/**
 * ฟังก์ชัน Guard สำหรับป้องกันหน้าเพจที่สงวนสิทธิ์เฉพาะ Premium (Server Components เท่านั้น)
 * หากผู้ใช้ไม่ใช่ premium หรือหมดอายุ จะทำการ redirect ไปยังหน้า /subscription?locked=true ทันที
 */
export async function requirePremiumAccess(): Promise<SubscriptionInfo> {
  const sub = await getSubscriptionInfo();
  if (!sub || !sub.isPremium) {
    redirect("/subscription?locked=true");
  }
  return sub;
}

/**
 * ดึงข้อมูลสถานะ Subscription และสิทธิ์การใช้งานของผู้ใช้ปัจจุบัน (Server Components เท่านั้น)
 */
export async function getSubscriptionInfo(): Promise<SubscriptionInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, subscription_plan, subscribed_at, expires_at")
    .eq("id", user.id)
    .single();

  const now = new Date();
  const rawRole = (profile?.role as UserRole) || "member";
  const expiresAt = profile?.expires_at ? new Date(profile.expires_at) : null;
  const subscribedAt = profile?.subscribed_at
    ? new Date(profile.subscribed_at)
    : null;

  // ตรวจสอบว่าหมดอายุแล้วหรือไม่
  const isExpired = expiresAt ? now.getTime() > expiresAt.getTime() : false;

  // เป็น Premium ได้ก็ต่อเมื่อ role คือ 'premium' และยังไม่หมดอายุ
  const isPremium = rawRole === "premium" && !isExpired;
  const effectiveRole: UserRole = isPremium ? "premium" : "member";

  let daysLeft: number | null = null;
  if (expiresAt && !isExpired) {
    const diffMs = expiresAt.getTime() - now.getTime();
    daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return {
    userId: user.id,
    role: rawRole,
    effectiveRole,
    plan: (profile?.subscription_plan as "monthly" | "yearly") || null,
    subscribedAt,
    expiresAt,
    isExpired,
    isPremium,
    daysLeft,
  };
}
