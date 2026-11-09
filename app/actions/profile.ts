"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ProfileRecord {
  id: string;
  username: string;
  fname?: string | null;
  lname?: string | null;
  display_name?: string | null;
  avatar_type?: string | null;
  avatar_icon?: string | null;
  avatar_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  created_at?: string | null;
}

/**
 * ดึงข้อมูล Profile ของผู้ใช้ปัจจุบันที่ล็อกอินอยู่
 * หากยังไม่มีแถวข้อมูลในตาราง profiles ระบบจะ auto-create เริ่มต้นให้ทันที
 */
export async function getCurrentUserProfile(): Promise<ProfileRecord | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile) {
    return profile as ProfileRecord;
  }

  // หากยังไม่มี profile ให้ upsert ค่าเริ่มต้น
  const defaultUsername =
    user.user_metadata?.username ||
    user.email?.split("@")[0] ||
    `user_${user.id.slice(0, 8)}`;
  const defaultDisplayName =
    user.user_metadata?.fname
      ? `${user.user_metadata.fname} ${user.user_metadata.lname || ""}`.trim()
      : defaultUsername;

  const initialProfile = {
    id: user.id,
    username: defaultUsername,
    display_name: defaultDisplayName,
    fname: user.user_metadata?.fname || null,
    lname: user.user_metadata?.lname || null,
    avatar_type: "icon",
    avatar_icon: "User",
  };

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .upsert(initialProfile)
    .select()
    .single();

  if (insertError) {
    console.error("Failed to initialize profile:", insertError);
    return null;
  }

  return created as ProfileRecord;
}

/**
 * ดึงข้อมูล Profile ตาม user_id สำหรับแสดงบนกระดานสนทนา
 */
export async function getUserProfile(userId: string): Promise<ProfileRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as ProfileRecord;
}

/**
 * ดึง path สำหรับอ้างอิงใน Supabase Storage Bucket 'avatars'
 */
function extractStoragePath(rawUrlOrPath?: string | null): string | null {
  if (!rawUrlOrPath) return null;
  if (rawUrlOrPath.startsWith("blob:")) return null;

  let path = rawUrlOrPath;
  if (path.includes("/avatars/")) {
    path = path.split("/avatars/")[1];
  }
  path = path.split("?")[0].trim();
  return path || null;
}

/**
 * ลบรูปโปรไฟล์เก่าออกจาก Supabase Storage Bucket 'avatars'
 * เพื่อไม่ให้มีไฟล์รูปภาพที่ไม่ได้ใช้งานตกค้างในระบบ
 */
async function cleanupOldAvatars(
  supabase: any,
  userId: string,
  oldAvatarUrl?: string | null,
  keepPath?: string | null
) {
  try {
    const toDeleteSet = new Set<string>();

    const oldExtracted = extractStoragePath(oldAvatarUrl);
    const keepExtracted = extractStoragePath(keepPath);

    if (oldExtracted && oldExtracted !== keepExtracted) {
      toDeleteSet.add(oldExtracted);
    }

    // สแกนและลบไฟล์เก่าในโฟลเดอร์ของ user นี้
    const { data: files } = await supabase.storage.from("avatars").list(userId);
    if (files && files.length > 0) {
      const keepFileName = keepExtracted ? keepExtracted.split("/").pop() : null;
      for (const file of files) {
        if (file.name && file.name !== keepFileName) {
          toDeleteSet.add(`${userId}/${file.name}`);
        }
      }
    }

    const filesToDelete = Array.from(toDeleteSet);
    if (filesToDelete.length > 0) {
      const { error: removeError } = await supabase.storage
        .from("avatars")
        .remove(filesToDelete);
      if (removeError) {
        console.warn("Could not delete old avatars from storage:", removeError);
      }
    }
  } catch (err) {
    console.warn("cleanupOldAvatars error:", err);
  }
}

/**
 * บันทึกการแก้ไขข้อมูลโปรไฟล์ (Display name, Avatar selection, Social links)
 */
export async function updateProfile(formData: {
  display_name: string;
  avatar_type: "icon" | "upload";
  avatar_icon?: string;
  avatar_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

  // ดึงข้อมูลโปรไฟล์ปัจจุบันเพื่อตรวจสอบรูปภาพเดิมก่อนอัปเดต
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("avatar_url, avatar_type")
    .eq("id", user.id)
    .single();

  const updatePayload: Record<string, any> = {
    display_name: formData.display_name?.trim() || null,
    avatar_type: formData.avatar_type || "icon",
    avatar_icon: formData.avatar_icon || "User",
    avatar_url: formData.avatar_url || null,
    instagram_url: formData.instagram_url?.trim() || null,
    facebook_url: formData.facebook_url?.trim() || null,
    youtube_url: formData.youtube_url?.trim() || null,
    tiktok_url: formData.tiktok_url?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Update profile error:", error);
    throw new Error("บันทึกข้อมูลไม่สำเร็จ: " + error.message);
  }

  // ลบรูปภาพเก่าใน bucket 'avatars' เมื่อเปลี่ยนรูปใหม่ หรือเปลี่ยนไปใช้ icon
  const oldAvatarUrl = currentProfile?.avatar_url;
  const newAvatarUrl = formData.avatar_url;
  const isTypeIcon = formData.avatar_type === "icon";

  if (isTypeIcon || (oldAvatarUrl && oldAvatarUrl !== newAvatarUrl)) {
    const keepPath = isTypeIcon ? null : newAvatarUrl;
    await cleanupOldAvatars(supabase, user.id, oldAvatarUrl, keepPath);
  }

  revalidatePath("/board");
  revalidatePath("/system/profile");
  return { success: true, profile: data };
}

/**
 * Server Action สำหรับอัปโหลดไฟล์รูปภาพ Avatar (WebP) ไปยัง Supabase Storage Bucket 'avatars'
 */
export async function uploadAvatarFile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

  const file = formData.get("file") as File;
  if (!file) throw new Error("ไม่พบไฟล์รูปภาพ");

  // ตรวจสอบขนาดไฟล์ (สูงสุด 5MB ก่อน optimize)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("ไฟล์รูปภาพมีขนาดใหญ่เกิน 5MB");
  }

  const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const fileBuffer = await file.arrayBuffer();

  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(fileName, fileBuffer, {
      contentType: file.type || "image/webp",
      upsert: true,
    });

  if (error) {
    console.error("Avatar storage upload error:", error);
    throw new Error("อัปโหลดรูปภาพไม่สำเร็จ: " + error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(fileName);

  return {
    success: true,
    filePath: fileName,
    publicUrl,
  };
}
