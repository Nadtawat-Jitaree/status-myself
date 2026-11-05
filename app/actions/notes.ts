"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function removeNoteAttachment(id: string, filePath: string) {
  const supabase = await createClient();
  const { error: storageError } = await supabase.storage
    .from("note_attachments")
    .remove([filePath]);

  if (storageError) {
    console.error("ลบไฟล์จาก Storage ไม่สำเร็จ:", storageError.message);
    throw new Error("ไม่สามารถลบไฟล์เก่าได้");
  }
  const { error: dbError } = await supabase
    .from("notes")
    .update({ file_path: null })
    .eq("id", id);

  if (dbError) throw new Error(dbError.message);

  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");
  return { success: true };
}

export async function getNotes(noteType: string): Promise<any[]> {
  const supabase = await createClient();

  const fetchNotesInternal = async (
    fieldsLevel: "full" | "yearOnly" | "basic",
    includePinned: boolean,
  ) => {
    let selectString = "*, note_categories!inner(name, note_type, pic)";
    if (fieldsLevel === "full") {
      selectString =
        "*, note_categories!inner(name, note_type, pic, year, semester)";
    } else if (fieldsLevel === "yearOnly") {
      selectString = "*, note_categories!inner(name, note_type, pic, year)";
    }

    let query: any = (supabase.from("notes") as any)
      .select(selectString)
      .eq("note_categories.note_type", noteType);

    if (includePinned) {
      query = query.order("is_pinned", { ascending: false });
    }
    return query.order("created_at", { ascending: false });
  };

  // 1. ลองดึงแบบครบ (มีทั้ง year, semester และ is_pinned)
  let res = await fetchNotesInternal("full", true);

  // 2. หากยังไม่มี semester ให้ fallback เป็น yearOnly
  if (res.error && res.error.message.includes("semester")) {
    res = await fetchNotesInternal("yearOnly", true);
  }

  // 3. หากยังไม่มี year บนตาราง note_categories ให้ fallback ดึงแบบ basic
  if (res.error && res.error.message.includes("year")) {
    res = await fetchNotesInternal("basic", true);
  }

  // 4. หากยังไม่มีคอลัมน์ is_pinned ให้ fallback ไปเรียงตาม created_at ปกติ
  if (res.error && res.error.message.includes("is_pinned")) {
    res = await fetchNotesInternal("basic", false);
  }

  if (res.error) {
    throw new Error(res.error.message);
  }

  return (res.data || []) as any[];
}

export async function togglePinNote(id: string, isPinned: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("notes")
    .update({ is_pinned: isPinned })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (error.message.includes("is_pinned")) {
      throw new Error(
        "ยังไม่ได้สร้างคอลัมน์ is_pinned ในตาราง notes บน Supabase กรุณารัน SQL: ALTER TABLE public.notes ADD COLUMN is_pinned boolean DEFAULT false;",
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");
  return { success: true };
}

export async function createNote(payload: {
  title: string;
  content: string;
  category_id: string | null;
  status: string;
  file_path?: string | null;
  is_pinned?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("notes")
    .insert([{ user_id: user.id, ...payload }]);
  if (error) throw new Error(error.message);

  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");
  return { success: true };
}

export async function updateNote(
  id: string,
  payload: {
  title: string;
  content: string;
  category_id: string | null;
  status: string;
  file_path?: string | null;
  is_pinned?: boolean;
  },
) {
  const supabase = await createClient();

  if (payload.file_path !== undefined) {
    const { data: oldNote } = await supabase
      .from("notes")
      .select("file_path")
      .eq("id", id)
      .single();

    if (
      oldNote &&
      oldNote.file_path &&
      oldNote.file_path !== payload.file_path
    ) {
      const { error: removeError } = await supabase.storage
        .from("note_attachments")
        .remove([oldNote.file_path]);

      if (removeError) {
        console.error("เกิดข้อผิดพลาดในการลบไฟล์เก่า:", removeError.message);
      }
    }
  }

  const { error } = await supabase.from("notes").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");
  return { success: true };
}
export async function deleteNote(id: string) {
  const supabase = await createClient();

  const { data: oldNote } = await supabase
    .from("notes")
    .select("file_path")
    .eq("id", id)
    .single();

  if (oldNote?.file_path) {
    await supabase.storage.from("note_attachments").remove([oldNote.file_path]);
  }

  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");
  return { success: true };
}

export async function getCategories(noteType: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("note_categories")
    .select("*")
    .eq("note_type", noteType)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createCategory(
  name: string,
  noteType: string,
  pic?: string | null,
  year?: number | null,
  semester?: number | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const insertPayload: Record<string, any> = {
    user_id: user.id,
    name,
    note_type: noteType,
    pic,
  };
  if (year !== undefined && year !== null) {
    insertPayload.year = year;
  }
  if (semester !== undefined && semester !== null) {
    insertPayload.semester = semester;
  }

  let { error } = await supabase
    .from("note_categories")
    .insert([insertPayload]);

  if (error) {
    // หากฐานข้อมูลยังไม่ได้เพิ่มคอลัมน์ semester หรือ year ให้ fallback ตามลำดับ
    if (error.message.includes("semester")) {
      delete insertPayload.semester;
      const res = await supabase.from("note_categories").insert([insertPayload]);
      error = res.error;
    }

    if (error && error.message.includes("year")) {
      delete insertPayload.year;
      const res = await supabase.from("note_categories").insert([insertPayload]);
      error = res.error;
    }

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");
  return { success: true };
}

export async function updateCategory(
  id: string,
  name: string,
  pic?: string | null,
  year?: number | null,
  semester?: number | null,
) {
  const supabase = await createClient();

  if (pic !== undefined) {
    const { data: oldCat } = await supabase
      .from("note_categories")
      .select("pic")
      .eq("id", id)
      .single();
    if (oldCat && oldCat.pic && oldCat.pic !== pic) {
      await supabase.storage.from("logo").remove([oldCat.pic]);
    }
  }

  const updateData: Record<string, any> = { name };
  if (pic !== undefined) updateData.pic = pic;
  if (year !== undefined) updateData.year = year;
  if (semester !== undefined) updateData.semester = semester;

  let { error } = await supabase
    .from("note_categories")
    .update(updateData)
    .eq("id", id);

  if (error) {
    if (error.message.includes("semester")) {
      delete updateData.semester;
      const res = await supabase.from("note_categories").update(updateData).eq("id", id);
      error = res.error;
    }

    if (error && error.message.includes("year")) {
      delete updateData.year;
      const res = await supabase.from("note_categories").update(updateData).eq("id", id);
      error = res.error;
    }

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();

  const { data: oldCat } = await supabase
    .from("note_categories")
    .select("pic")
    .eq("id", id)
    .single();
  if (oldCat?.pic) {
    await supabase.storage.from("logo").remove([oldCat.pic]);
  }

  const { error } = await supabase
    .from("note_categories")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");
  return { success: true };
}
