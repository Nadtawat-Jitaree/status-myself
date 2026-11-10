"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateSecureToken, detectTokenVersion } from "@/lib/crypto-hash";
import {
  validateNoteForShare,
  validateCategoryForShare,
} from "@/lib/moderation/profanity-filter";

/**
 * สลับสถานะเปิด/ปิดการแชร์ของโน้ตเดี่ยว (พร้อมสร้าง Secure Hashed Token และตรวจสอบคำหยาบก่อนแชร์)
 */
export async function toggleShareNote(noteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

  // ตรวจสอบโน้ตและความเป็นเจ้าของ พร้อมดึง title และ content
  const { data: note, error: fetchError } = await supabase
    .from("notes")
    .select("id, title, content, is_shared, share_token")
    .eq("id", noteId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !note) {
    throw new Error("ไม่พบโน้ตหรือคุณไม่มีสิทธิ์ในการจัดการโน้ตนี้");
  }

  const nextShared = !note.is_shared;

  // หากกำลังจะเปิดแชร์ (nextShared = true) ให้ตรวจสอบคำหยาบและคำต้องห้ามก่อน
  if (nextShared) {
    const validation = validateNoteForShare(note.title, note.content);
    if (!validation.isClean) {
      throw new Error(validation.errorMessage || "ไม่สามารถเปิดแชร์ได้เนื่องจากพบบันทึกมีคำไม่เหมาะสม");
    }
  }

  // หากเปิดแชร์และยังไม่มี token ให้สร้าง Secure Token แบบ SHA-256
  const nextToken = nextShared ? (note.share_token || generateSecureToken("n")) : note.share_token;

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

  revalidatePath("/board");
  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");

  return {
    success: true,
    is_shared: nextShared,
    share_token: nextToken,
    token_version: nextToken ? detectTokenVersion(nextToken) : null,
  };
}

/**
 * Rehashing: สร้างและหมุนเวียน Share Token ใหม่ที่ปลอดภัยขึ้นสำหรับโน้ต (Revoke ลิงก์เดิม พร้อมตรวจคำหยาบ)
 */
export async function regenerateNoteShareToken(noteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

  // ตรวจสอบเนื้อหาโน้ตก่อนสร้าง token ใหม่
  const { data: note, error: fetchError } = await supabase
    .from("notes")
    .select("id, title, content")
    .eq("id", noteId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !note) {
    throw new Error("ไม่พบโน้ตหรือคุณไม่มีสิทธิ์ในการจัดการโน้ตนี้");
  }

  const validation = validateNoteForShare(note.title, note.content);
  if (!validation.isClean) {
    throw new Error(validation.errorMessage || "ไม่สามารถสร้างลิงก์แชร์ใหม่ได้เนื่องจากพบคำไม่เหมาะสม");
  }

  // Rehashing สร้าง Token ใหม่ด้วย SHA-256 + CSPRNG
  const newToken = generateSecureToken("n");
  const { error } = await supabase
    .from("notes")
    .update({ share_token: newToken, is_shared: true })
    .eq("id", noteId)
    .eq("user_id", user.id);

  if (error) throw new Error("สร้างลิงก์ใหม่ไม่สำเร็จ: " + error.message);

  revalidatePath("/board");
  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");

  return {
    success: true,
    share_token: newToken,
    token_version: detectTokenVersion(newToken),
  };
}

/**
 * สลับสถานะเปิด/ปิดการแชร์ของหมวดหมู่ (Category พร้อมตรวจคำหยาบในหมวดหมู่และโน้ตภายใน)
 */
export async function toggleShareCategory(categoryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

  const { data: category, error: fetchError } = await supabase
    .from("note_categories")
    .select("id, name, description, is_shared, share_token")
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !category) {
    throw new Error("ไม่พบหมวดหมู่หรือคุณไม่มีสิทธิ์ในการจัดการหมวดหมู่นี้");
  }

  const nextShared = !category.is_shared;

  if (nextShared) {
    // ดึงโน้ตทั้งหมดในหมวดหมู่นี้เพื่อตรวจคำหยาบ
    const { data: childNotes } = await supabase
      .from("notes")
      .select("title, content")
      .eq("category_id", categoryId)
      .eq("user_id", user.id);

    const validation = validateCategoryForShare(
      category.name,
      category.description,
      childNotes || []
    );

    if (!validation.isClean) {
      throw new Error(validation.errorMessage || "ไม่สามารถแชร์หมวดหมู่นี้ได้เนื่องจากพบคำไม่เหมาะสม");
    }
  }

  const nextToken = nextShared
    ? (category.share_token || generateSecureToken("c"))
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

  revalidatePath("/board");
  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");

  return {
    success: true,
    is_shared: nextShared,
    share_token: nextToken,
    token_version: nextToken ? detectTokenVersion(nextToken) : null,
  };
}

/**
 * Rehashing: สร้างและหมุนเวียน Share Token ใหม่สำหรับหมวดหมู่ (พร้อมตรวจคำหยาบ)
 */
export async function regenerateCategoryShareToken(categoryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

  const { data: category, error: fetchError } = await supabase
    .from("note_categories")
    .select("id, name, description")
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !category) {
    throw new Error("ไม่พบหมวดหมู่หรือคุณไม่มีสิทธิ์ในการจัดการหมวดหมู่นี้");
  }

  const { data: childNotes } = await supabase
    .from("notes")
    .select("title, content")
    .eq("category_id", categoryId)
    .eq("user_id", user.id);

  const validation = validateCategoryForShare(
    category.name,
    category.description,
    childNotes || []
  );

  if (!validation.isClean) {
    throw new Error(validation.errorMessage || "ไม่สามารถสร้างลิงก์แชร์ใหม่ได้เนื่องจากพบคำไม่เหมาะสม");
  }

  const newToken = generateSecureToken("c");
  const { error } = await supabase
    .from("note_categories")
    .update({ share_token: newToken, is_shared: true })
    .eq("id", categoryId)
    .eq("user_id", user.id);

  if (error) throw new Error("สร้างลิงก์ใหม่ไม่สำเร็จ: " + error.message);

  revalidatePath("/board");
  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");

  return {
    success: true,
    share_token: newToken,
    token_version: detectTokenVersion(newToken),
  };
}

/**
 * ฟังก์ชัน Rehashing แบบรวมศูนย์สำหรับ Note หรือ Category
 */
export async function rehashShareToken(type: "note" | "category", id: string) {
  if (type === "note") {
    return await regenerateNoteShareToken(id);
  } else {
    return await regenerateCategoryShareToken(id);
  }
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
