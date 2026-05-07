"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ==========================================
// ส่วนจัดการ Note (GET, POST, PUT, DELETE)
// ==========================================

export async function getNotes() {
  const supabase = createClient(); // เรียกใช้ Supabase ฝั่ง Server
  const { data, error } = await (await supabase)
    .from("notes")
    .select("*, note_categories(name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createNote(payload: { title: string; content: string; category_id: string | null; status: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("notes").insert([{ user_id: user.id, ...payload }]);
  if (error) throw new Error(error.message);

  revalidatePath("/notes"); // สั่งให้ Next.js เคลียร์แคชหน้านี้
  return { success: true };
}

export async function updateNote(id: string, payload: { title: string; content: string; category_id: string | null; status: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/notes");
  return { success: true };
}

export async function deleteNote(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/notes");
  return { success: true };
}

// ==========================================
// ส่วนจัดการ Category (GET, POST, PUT, DELETE)
// ==========================================

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("note_categories").insert([{ user_id: user.id, name }]);
  if (error) throw new Error(error.message);

  revalidatePath("/notes");
  return { success: true };
}

export async function updateCategory(id: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("note_categories").update({ name }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/notes");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("note_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/notes");
  return { success: true };
}