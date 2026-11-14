/**
 * Cached profile queries สำหรับ Server Components
 * ใช้ React cache() เพื่อ deduplicate DB queries ภายใน render pass เดียวกัน
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRecord } from "@/app/actions/profile";

/**
 * ดึง Profile ของ user ที่ login อยู่ — cache per render pass
 * NavbarRight และ Page Components อื่นๆ แชร์ผลลัพธ์เดิมได้เลย
 */
export const getCachedCurrentUserProfile = cache(
  async (): Promise<ProfileRecord | null> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) return profile as ProfileRecord;

    // Auto-create profile หากยังไม่มี
    const defaultUsername =
      user.user_metadata?.username ||
      user.email?.split("@")[0] ||
      `user_${user.id.slice(0, 8)}`;
    const defaultDisplayName = user.user_metadata?.fname
      ? `${user.user_metadata.fname} ${user.user_metadata.lname || ""}`.trim()
      : defaultUsername;

    const { data: created } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        username: defaultUsername,
        display_name: defaultDisplayName,
        fname: user.user_metadata?.fname || null,
        lname: user.user_metadata?.lname || null,
        avatar_type: "icon",
        avatar_icon: "User",
      })
      .select()
      .single();

    return created as ProfileRecord | null;
  },
);
