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
  task_id?: string | null;
  project_id?: string | null;
  note_title?: string | null;
  task_title?: string | null;
  project_name?: string | null;
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

  // 1. ลบ note_qualities และ transactions เก่าของ note นี้ (ถ้ามี) แบบ Parallel (ลด Network Roundtrip)
  await Promise.all([
    supabase
      .from("note_qualities")
      .delete()
      .eq("note_id", noteId)
      .eq("user_id", user.id),
    supabase
      .from("quality_transactions")
      .delete()
      .eq("note_id", noteId)
      .eq("user_id", user.id),
  ]);

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

  // รัน insert ทั้งสองแบบ Parallel เพื่อความรวดเร็ว
  const [nqRes, txRes] = await Promise.all([
    supabase.from("note_qualities").insert(noteQualitiesInsert),
    supabase.from("quality_transactions").insert(transactionsInsert),
  ]);

  if (nqRes.error) {
    console.error("Error inserting note qualities:", nqRes.error.message);
  }

  if (txRes.error) {
    console.error("Error inserting note quality transactions:", txRes.error.message);
  }

  revalidatePath("/system/qualities");
  revalidatePath("/system/notes");
  revalidatePath("/system/dashboard");
  return { success: true };
}

/**
 * ดึงข้อมูลคุณสมบัติที่เชื่อมโยงกับ Task หนึ่งงาน
 */
export async function getTaskQualities(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("task_qualities")
    .select("quality_id, level, qualities(id, name, icon, color)")
    .eq("task_id", taskId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching task qualities:", error.message);
    return [];
  }

  return (data || []) as unknown as {
    quality_id: string;
    level: 1 | 3 | 5;
    qualities?: { id: string; name: string; icon: string; color: string } | null;
  }[];
}

/**
 * บันทึกและซิงค์คุณสมบัติสำหรับ Task หนึ่งงาน
 * หากสถานะของงานเป็น 'done' อยู่แล้ว จะปรับปรุง transactions และแต้มตามไปด้วย
 */
export async function syncTaskQualities(
  taskId: string,
  selectedQualities: SelectedQualityInput[],
  projectId?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // ดึงข้อมูล task เพื่อดูสถานะปัจจุบัน
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, status, project_id, projects(id, name)")
    .eq("id", taskId)
    .single();

  const finalProjectId = projectId || task?.project_id;
  const isDone = task?.status === "done";

  // 1. ลบรายการ task_qualities เดิมของงานนี้
  await supabase
    .from("task_qualities")
    .delete()
    .eq("task_id", taskId)
    .eq("user_id", user.id);

  // 2. ถ้ามีคุณสมบัติที่เลือก ให้ Insert ลง task_qualities
  if (selectedQualities && selectedQualities.length > 0) {
    const taskQualitiesInsert = selectedQualities.map((item) => ({
      task_id: taskId,
      quality_id: item.quality_id,
      user_id: user.id,
      level: item.level,
    }));

    const { error: tqError } = await supabase
      .from("task_qualities")
      .insert(taskQualitiesInsert);

    if (tqError) {
      console.error("Error inserting task qualities:", tqError.message);
    }
  }

  // 3. จัดการ Transactions ถ้างานนั้นอยู่ในสถานะ 'done' (สำเร็จ) อยู่แล้ว
  if (isDone) {
    // ลบ Transaction เก่าของงานนี้ออกก่อน (Trigger จะหักแต้มออก)
    await supabase
      .from("quality_transactions")
      .delete()
      .eq("task_id", taskId)
      .eq("user_id", user.id);

    // ถ้ามีคุณสมบัติใหม่ ให้เพิ่ม Transaction ใหม่ (Trigger จะบวกแต้มใหม่)
    if (selectedQualities && selectedQualities.length > 0) {
      const qualityIds = selectedQualities.map((q) => q.quality_id);
      const { data: qualitiesData } = await supabase
        .from("qualities")
        .select("id, name, icon")
        .in("id", qualityIds)
        .eq("user_id", user.id);

      const qualityMap = new Map((qualitiesData || []).map((q) => [q.id, q]));
      const levelLabelMap: Record<number, string> = {
        1: "ปกติ (+1)",
        3: "กลาง (+3)",
        5: "มาก (+5)",
      };

      const projectName = (task?.projects as any)?.name || "โปรเจกต์";
      const txs = selectedQualities.map((item) => {
        const qInfo = qualityMap.get(item.quality_id);
        return {
          user_id: user.id,
          quality_id: item.quality_id,
          note_id: null,
          task_id: taskId,
          project_id: finalProjectId,
          task_title: task?.title || "งานในโปรเจกต์",
          project_name: projectName,
          quality_name: qInfo?.name || "คุณสมบัติ",
          quality_icon: qInfo?.icon || "Star",
          points_delta: item.level,
          level_label: levelLabelMap[item.level] || `+${item.level}`,
          source: "task",
        };
      });

      const { error: txError } = await supabase
        .from("quality_transactions")
        .insert(txs);

      if (txError) {
        console.error("Error inserting task quality transactions:", txError.message);
      }
    }
  }

  if (finalProjectId) {
    revalidatePath(`/system/projects/${finalProjectId}`);
  }
  revalidatePath("/system/qualities");
  revalidatePath("/system/dashboard");
  return { success: true };
}

/**
 * เพิ่มแต้มคุณสมบัติเมื่อ Task มีสถานะเป็น 'done' (สำเร็จ)
 */
export async function awardTaskQualities(taskId: string, projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // ป้องกันการให้แต้มซ้ำซ้อน (Idempotency check)
  const { data: existingTxs } = await supabase
    .from("quality_transactions")
    .select("id")
    .eq("task_id", taskId)
    .eq("user_id", user.id);

  if (existingTxs && existingTxs.length > 0) {
    return { success: true, message: "Already awarded" };
  }

  // ดึงคุณสมบัติที่ผูกไว้กับ Task
  const { data: taskQualities } = await supabase
    .from("task_qualities")
    .select("quality_id, level")
    .eq("task_id", taskId)
    .eq("user_id", user.id);

  if (!taskQualities || taskQualities.length === 0) {
    return { success: true };
  }

  // ดึงชื่อ Task และ Project เพื่อทำ snapshot
  const { data: taskData } = await supabase
    .from("tasks")
    .select("title")
    .eq("id", taskId)
    .single();

  const { data: projectData } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  const qualityIds = taskQualities.map((item) => item.quality_id);
  const { data: qualitiesData } = await supabase
    .from("qualities")
    .select("id, name, icon")
    .in("id", qualityIds)
    .eq("user_id", user.id);

  const qualityMap = new Map((qualitiesData || []).map((q) => [q.id, q]));
  const levelLabelMap: Record<number, string> = {
    1: "ปกติ (+1)",
    3: "กลาง (+3)",
    5: "มาก (+5)",
  };

  const transactionsInsert = taskQualities.map((item) => {
    const qInfo = qualityMap.get(item.quality_id);
    return {
      user_id: user.id,
      quality_id: item.quality_id,
      note_id: null,
      task_id: taskId,
      project_id: projectId,
      task_title: taskData?.title || "งานในโปรเจกต์",
      project_name: projectData?.name || "โปรเจกต์",
      quality_name: qInfo?.name || "คุณสมบัติ",
      quality_icon: qInfo?.icon || "Star",
      points_delta: item.level,
      level_label: levelLabelMap[item.level] || `+${item.level}`,
      source: "task",
    };
  });

  const { error: txError } = await supabase
    .from("quality_transactions")
    .insert(transactionsInsert);

  if (txError) {
    console.error("Error awarding task qualities:", txError.message);
  }

  revalidatePath(`/system/projects/${projectId}`);
  revalidatePath("/system/qualities");
  revalidatePath("/system/dashboard");
  return { success: true };
}

/**
 * ยกเลิกแต้มคุณสมบัติเมื่อ Task ถูกเปลี่ยนสถานะออกจาก 'done' (กลับไป todo หรือ in_progress)
 */
export async function revokeTaskQualities(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("quality_transactions")
    .delete()
    .eq("task_id", taskId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error revoking task qualities:", error.message);
  }

  revalidatePath("/system/qualities");
  revalidatePath("/system/dashboard");
  return { success: true };
}
