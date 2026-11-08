"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Quality {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  points: number;
  color: string;
  description?: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface QualityTransaction {
  id: string;
  user_id: string;
  quality_id: string;
  note_id?: string | null;
  note_title?: string | null;
  quality_name?: string | null;
  quality_icon?: string | null;
  points_delta: number;
  level_label?: string | null;
  source: string;
  created_at: string;
}

export interface SelectedQualityInput {
  quality_id: string;
  level: 1 | 3 | 5;
}

/**
 * ดึงรายการคุณสมบัติทั้งหมดของผู้ใช้ปัจจุบัน
 */
export async function getQualities(): Promise<Quality[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("qualities")
    .select("*")
    .eq("user_id", user.id)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as Quality[];
}

/**
 * สร้างคุณสมบัติใหม่
 */
export async function createQuality(payload: {
  name: string;
  icon: string;
  color?: string;
  description?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("qualities")
    .insert([
      {
        user_id: user.id,
        name: payload.name.trim(),
        icon: payload.icon || "Star",
        color: payload.color || "#6366f1",
        description: payload.description?.trim() || null,
        points: 0,
        is_active: true,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/system/qualities");
  revalidatePath("/system/notes");
  revalidatePath("/system/dashboard");
  return { success: true, data };
}

/**
 * แก้ไขข้อมูลคุณสมบัติ
 */
export async function updateQuality(
  id: string,
  payload: {
    name?: string;
    icon?: string;
    color?: string;
    description?: string;
    is_active?: boolean;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.name !== undefined) updateData.name = payload.name.trim();
  if (payload.icon !== undefined) updateData.icon = payload.icon;
  if (payload.color !== undefined) updateData.color = payload.color;
  if (payload.description !== undefined)
    updateData.description = payload.description.trim() || null;
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

  const { error } = await supabase
    .from("qualities")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/system/qualities");
  revalidatePath("/system/notes");
  revalidatePath("/system/dashboard");
  return { success: true };
}

/**
 * ลบคุณสมบัติ
 */
export async function deleteQuality(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("qualities")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/system/qualities");
  revalidatePath("/system/notes");
  revalidatePath("/system/dashboard");
  return { success: true };
}

/**
 * ดึงรายการ Transactions ประวัติการเพิ่มแต้มทั้งหมดของผู้ใช้
 */
export async function getQualityTransactions(limit = 100): Promise<QualityTransaction[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("quality_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as QualityTransaction[];
}

/**
 * ดึงข้อมูลคุณสมบัติที่เชื่อมโยงกับ Note ใบหนึ่ง
 */
export async function getNoteQualities(noteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("note_qualities")
    .select("quality_id, level")
    .eq("note_id", noteId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching note qualities:", error.message);
    return [];
  }

  return (data || []) as { quality_id: string; level: 1 | 3 | 5 }[];
}

/**
 * ซิงค์คุณสมบัติและบันทึก transactions สำหรับ Note หนึ่งใบ
 */
export async function syncNoteQualities(
  noteId: string,
  noteTitle: string,
  selectedQualities: SelectedQualityInput[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 1. ลบ note_qualities และ transactions เก่าของ note นี้ (ถ้ามี)
  await supabase
    .from("note_qualities")
    .delete()
    .eq("note_id", noteId)
    .eq("user_id", user.id);

  await supabase
    .from("quality_transactions")
    .delete()
    .eq("note_id", noteId)
    .eq("user_id", user.id);

  if (!selectedQualities || selectedQualities.length === 0) {
    revalidatePath("/system/qualities");
    revalidatePath("/system/notes");
    return { success: true };
  }

  // ดึงรายละเอียดของคุณสมบัติเพื่อทำ snapshot ลง transaction
  const qualityIds = selectedQualities.map((q) => q.quality_id);
  const { data: qualitiesData } = await supabase
    .from("qualities")
    .select("id, name, icon")
    .in("id", qualityIds)
    .eq("user_id", user.id);

  const qualityMap = new Map((qualitiesData || []).map((q) => [q.id, q]));

  // เตรียม Insert note_qualities
  const noteQualitiesInsert = selectedQualities.map((item) => ({
    note_id: noteId,
    quality_id: item.quality_id,
    user_id: user.id,
    level: item.level,
  }));

  const { error: nqError } = await supabase
    .from("note_qualities")
    .insert(noteQualitiesInsert);

  if (nqError) {
    console.error("Error inserting note qualities:", nqError.message);
  }

  // เตรียม Insert quality_transactions
  const levelLabelMap: Record<number, string> = {
    1: "ปกติ (+1)",
    3: "กลาง (+3)",
    5: "มาก (+5)",
  };

  const transactionsInsert = selectedQualities.map((item) => {
    const qInfo = qualityMap.get(item.quality_id);
    return {
      user_id: user.id,
      quality_id: item.quality_id,
      note_id: noteId,
      note_title: noteTitle,
      quality_name: qInfo?.name || "คุณสมบัติ",
      quality_icon: qInfo?.icon || "Star",
      points_delta: item.level,
      level_label: levelLabelMap[item.level] || `+${item.level}`,
      source: "note",
    };
  });

  const { error: txError } = await supabase
    .from("quality_transactions")
    .insert(transactionsInsert);

  if (txError) {
    console.error("Error inserting quality transactions:", txError.message);
  }

  revalidatePath("/system/qualities");
  revalidatePath("/system/notes");
  revalidatePath("/system/dashboard");
  return { success: true };
}
