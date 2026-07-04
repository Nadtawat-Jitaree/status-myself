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
  return { success: true };
}

export async function getNotes() {
  const supabase = createClient(); 
  const { data, error } = await (await supabase)
    .from("notes")
    .select("*, note_categories(name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createNote(payload: {
  title: string;
  content: string;
  category_id: string | null;
  status: string;
  file_path?: string | null;
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
  return { success: true };
}

export async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("note_categories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createCategory(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("note_categories")
    .insert([{ user_id: user.id, name }]);
  if (error) throw new Error(error.message);

  revalidatePath("/notes");
  return { success: true };
}

export async function updateCategory(id: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("note_categories")
    .update({ name })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/notes");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("note_categories")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/notes");
  return { success: true };
}
