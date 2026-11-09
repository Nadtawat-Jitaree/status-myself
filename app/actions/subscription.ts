"use server";

import { getSubscriptionInfo } from "@/lib/subscription";
import type { SubscriptionInfo } from "@/lib/subscription-types";
import { createClient } from "@/lib/supabase/server";

/**
 * ดึงสถานะ Subscription ของผู้ใช้ปัจจุบัน (Server Action สำหรับ Client Components)
 */
export async function getUserSubscriptionAction(): Promise<SubscriptionInfo | null> {
  return await getSubscriptionInfo();
}

/**
 * ดึงประวัติการชำระเงินของผู้ใช้ปัจจุบัน
 */
export async function getSubscriptionHistoryAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("subscription_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load subscription history:", error);
    return [];
  }

  return data || [];
}
