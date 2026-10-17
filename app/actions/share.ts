"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ฟังก์ชันสร้าง Token สุ่มที่มีความยาวปลอดภัยและอ่านง่ายใน URL
function generateToken(prefix: "n" | "c"): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}_${result}`;
}

/**
 * สลับสถานะเปิด/ปิดการแชร์ของโน้ตเดี่ยว
 */
export async function toggleShareNote(noteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

  // ตรวจสอบโน้ตและความเป็นเจ้าของ
  const { data: note, error: fetchError } = await supabase
    .from("notes")
    .select("id, is_shared, share_token")
    .eq("id", noteId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !note) {
    throw new Error("ไม่พบโน้ตหรือคุณไม่มีสิทธิ์ในการจัดการโน้ตนี้");
  }

  const nextShared = !note.is_shared;
  const nextToken = nextShared ? (note.share_token || generateToken("n")) : note.share_token;

  const { error: updateError } = await supabase
    .from("notes")
    .update({
      is_shared: nextShared,
      share_token: nextToken,
    })
    .eq("id", noteId)
    .eq("user_id", user.id);

  if (updateError) {
    throw new Error("ไม่สามารถเปลี่ยนสถานะการแชร์ได้: " + updateError.message);
  }

  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");

  return {
    success: true,
    is_shared: nextShared,
    share_token: nextToken,
  };
}

/**
 * สร้าง Share Token ใหม่สำหรับโน้ต (เพื่อยกเลิกลิงก์เดิม)
 */
export async function regenerateNoteShareToken(noteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

  const newToken = generateToken("n");
  const { error } = await supabase
    .from("notes")
    .update({ share_token: newToken, is_shared: true })
    .eq("id", noteId)
    .eq("user_id", user.id);

  if (error) throw new Error("สร้างลิงก์ใหม่ไม่สำเร็จ: " + error.message);

  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");

  return { success: true, share_token: newToken };
}

/**
 * สลับสถานะเปิด/ปิดการแชร์ของหมวดหมู่ (Category)
 */
export async function toggleShareCategory(categoryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

  const { data: category, error: fetchError } = await supabase
    .from("note_categories")
    .select("id, is_shared, share_token")
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !category) {
    throw new Error("ไม่พบหมวดหมู่หรือคุณไม่มีสิทธิ์ในการจัดการหมวดหมู่นี้");
  }

  const nextShared = !category.is_shared;
  const nextToken = nextShared
    ? (category.share_token || generateToken("c"))
    : category.share_token;

  const { error: updateError } = await supabase
    .from("note_categories")
    .update({
      is_shared: nextShared,
      share_token: nextToken,
    })
    .eq("id", categoryId)
    .eq("user_id", user.id);

  if (updateError) {
    throw new Error("ไม่สามารถเปลี่ยนสถานะการแชร์หมวดหมู่ได้: " + updateError.message);
  }

  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");

  return {
    success: true,
    is_shared: nextShared,
    share_token: nextToken,
  };
}

/**
 * สร้าง Share Token ใหม่สำหรับหมวดหมู่
 */
export async function regenerateCategoryShareToken(categoryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

  const newToken = generateToken("c");
  const { error } = await supabase
    .from("note_categories")
    .update({ share_token: newToken, is_shared: true })
    .eq("id", categoryId)
    .eq("user_id", user.id);

  if (error) throw new Error("สร้างลิงก์ใหม่ไม่สำเร็จ: " + error.message);

  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");

  return { success: true, share_token: newToken };
}

/**
 * ดึงข้อมูล Note ที่แชร์แบบสาธารณะด้วย share_token
 */
export async function getSharedNote(token: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notes")
    .select(`
      *,
      note_categories (
        id,
        name,
        note_type,
        pic
      )
    `)
    .eq("share_token", token)
    .eq("is_shared", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * ดึงข้อมูล Category และรายการ Note ทั้งหมดใน Category ที่แชร์แบบสาธารณะ
 */
export async function getSharedCategory(token: string) {
  const supabase = await createClient();

  // ดึงข้อมูล category ที่แชร์
  const { data: category, error: catError } = await supabase
    .from("note_categories")
    .select("*")
    .eq("share_token", token)
    .eq("is_shared", true)
    .single();

  if (catError || !category) {
    return null;
  }

  // ดึงโน้ตทั้งหมดที่อยู่ในหมวดหมู่นี้
  const { data: notes, error: notesError } = await supabase
    .from("notes")
    .select(`
      *,
      note_categories (
        id,
        name,
        note_type,
        pic
      )
    `)
    .eq("category_id", category.id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  return {
    category,
    notes: notes || [],
  };
}
