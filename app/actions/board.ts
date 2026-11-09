"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface BoardNoteItem {
  id: string;
  title: string;
  content: string | null;
  file_path: string | null;
  status: string | null;
  share_token: string | null;
  is_shared?: boolean;
  isOwner?: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  category: {
    id: string;
    name: string;
    pic?: string | null;
    note_type?: string | null;
  } | null;
  author: {
    id: string;
    username: string;
    display_name?: string | null;
    avatar_type?: string | null;
    avatar_icon?: string | null;
    avatar_url?: string | null;
    instagram_url?: string | null;
    facebook_url?: string | null;
    youtube_url?: string | null;
    tiktok_url?: string | null;
    created_at?: string | null;
  } | null;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  currentUserReaction?: "like" | "dislike" | null;
}

export interface BoardResponse {
  notes: BoardNoteItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

/**
 * ดึงรายการโน้ตบนกระดานสนทนาแบบแบ่งหน้า (Pagination 9 รายการต่อหน้า เรียงจากล่าสุด)
 */
export async function getBoardNotes(params: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sortBy?: "latest" | "popular" | "comments";
  filter?: "all" | "mine";
  shareStatus?: "all" | "shared" | "unshared";
}): Promise<BoardResponse> {
  const page = Math.max(1, params.page || 1);
  const limit = params.limit || 9;
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  // ดึง Current User (ถ้ามี)
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // หากเลือก filter 'mine' แต่ยังไม่ได้เข้าสู่ระบบ ให้ส่งผลลัพธ์ว่างกลับไป
  if (params.filter === "mine" && !currentUser) {
    return {
      notes: [],
      totalCount: 0,
      currentPage: page,
      totalPages: 1,
      pageSize: limit,
    };
  }

  // 1. Query โน้ตบนกระดาน (ถ้าเป็น 'mine' จะดึงโน้ตของผู้ใช้เองเพื่อจัดการเปิด/ปิดแชร์ได้ หากเป็นทั่วไปจะดึง is_shared = true)
  let query = supabase
    .from("notes")
    .select(
      `
      id,
      title,
      content,
      file_path,
      status,
      share_token,
      is_shared,
      created_at,
      updated_at,
      user_id,
      category_id,
      note_categories (
        id,
        name,
        pic,
        note_type
      )
    `,
      { count: "exact" }
    );

  if (params.filter === "mine" && currentUser) {
    query = query.eq("user_id", currentUser.id);

    // กรองสถานะการแชร์ในโน้ตของฉัน
    if (params.shareStatus === "shared") {
      query = query.eq("is_shared", true);
    } else if (params.shareStatus === "unshared") {
      query = query.or("is_shared.eq.false,is_shared.is.null");
    }
  } else {
    query = query.eq("is_shared", true).not("share_token", "is", null);
  }

  if (params.search?.trim()) {
    const s = params.search.trim();
    query = query.or(`title.ilike.%${s}%,content.ilike.%${s}%`);
  }

  if (params.category && params.category !== "all") {
    query = query.eq("category_id", params.category);
  }

  const isCustomSort = params.sortBy === "popular" || params.sortBy === "comments";

  let rawNotes: any[] = [];
  let count: number = 0;

  if (isCustomSort) {
    // ดึงโน้ตที่ตรงเงื่อนไขเพื่อมาจัดเรียงตาม Reactions / Comments
    const { data, count: c, error } = await query
      .order("created_at", { ascending: false })
      .limit(300);

    if (error || !data) {
      console.error("Error fetching board notes for custom sort:", error);
      return {
        notes: [],
        totalCount: 0,
        currentPage: page,
        totalPages: 1,
        pageSize: limit,
      };
    }
    rawNotes = data;
    count = c || data.length;
  } else {
    const { data, count: c, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      console.error("Error fetching board notes:", error);
      return {
        notes: [],
        totalCount: 0,
        currentPage: page,
        totalPages: 1,
        pageSize: limit,
      };
    }
    rawNotes = data;
    count = c || 0;
  }

  const noteIds = rawNotes.map((n) => n.id);
  const userIds = Array.from(new Set(rawNotes.map((n) => n.user_id)));

  // 2. ดึงข้อมูล Authors (Profiles) ในคิวรีเดียว
  let profilesMap = new Map<string, any>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);

    (profiles || []).forEach((p) => profilesMap.set(p.id, p));
  }

  // 3. ดึง Reactions สำหรับโน้ตชุดนี้
  let likesMap = new Map<string, number>();
  let dislikesMap = new Map<string, number>();
  let userReactionsMap = new Map<string, "like" | "dislike">();

  if (noteIds.length > 0) {
    const { data: reactions } = await supabase
      .from("note_reactions")
      .select("note_id, user_id, type")
      .in("note_id", noteIds);

    (reactions || []).forEach((r) => {
      if (r.type === "like") {
        likesMap.set(r.note_id, (likesMap.get(r.note_id) || 0) + 1);
      } else if (r.type === "dislike") {
        dislikesMap.set(r.note_id, (dislikesMap.get(r.note_id) || 0) + 1);
      }

      if (currentUser && r.user_id === currentUser.id) {
        userReactionsMap.set(r.note_id, r.type as "like" | "dislike");
      }
    });
  }

  // 4. ดึง Comment Counts
  let commentsMap = new Map<string, number>();
  if (noteIds.length > 0) {
    const { data: comments } = await supabase
      .from("note_comments")
      .select("note_id")
      .in("note_id", noteIds);

    (comments || []).forEach((c) => {
      commentsMap.set(c.note_id, (commentsMap.get(c.note_id) || 0) + 1);
    });
  }

  // 5. รวมผลลัพธ์
  let notes: BoardNoteItem[] = rawNotes.map((n) => {
    const cat = Array.isArray(n.note_categories)
      ? n.note_categories[0]
      : n.note_categories;
    const authorProfile = profilesMap.get(n.user_id);

    return {
      id: n.id,
      title: n.title,
      content: n.content,
      file_path: n.file_path,
      status: n.status,
      share_token: n.share_token,
      is_shared: n.is_shared ?? true,
      isOwner: Boolean(currentUser && currentUser.id === n.user_id),
      created_at: n.created_at,
      updated_at: n.updated_at,
      user_id: n.user_id,
      category: cat || null,
      author: authorProfile || {
        id: n.user_id,
        username: "user",
        display_name: "ผู้ใช้งาน",
        avatar_type: "icon",
        avatar_icon: "User",
      },
      likeCount: likesMap.get(n.id) || 0,
      dislikeCount: dislikesMap.get(n.id) || 0,
      commentCount: commentsMap.get(n.id) || 0,
      currentUserReaction: userReactionsMap.get(n.id) || null,
    };
  });

  if (params.sortBy === "popular") {
    notes.sort((a, b) => b.likeCount - a.likeCount || b.commentCount - a.commentCount);
  } else if (params.sortBy === "comments") {
    notes.sort((a, b) => b.commentCount - a.commentCount || b.likeCount - a.likeCount);
  }

  if (isCustomSort) {
    notes = notes.slice(offset, offset + limit);
  }

  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    notes,
    totalCount,
    currentPage: page,
    totalPages,
    pageSize: limit,
  };
}

/**
 * ดึงรายการหมวดหมู่ที่มีโน้ตแชร์สาธารณะ พร้อมจำนวนโน้ต
 */
export async function getBoardCategories(): Promise<
  { id: string; name: string; count: number }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("category_id, note_categories(id, name)")
    .eq("is_shared", true)
    .not("share_token", "is", null);

  if (!data) return [];

  const map = new Map<string, { id: string; name: string; count: number }>();
  for (const item of data) {
    const cat = Array.isArray(item.note_categories)
      ? item.note_categories[0]
      : item.note_categories;
    if (cat?.id && cat?.name) {
      const existing = map.get(cat.id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(cat.id, { id: cat.id, name: cat.name, count: 1 });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/**
 * ดึงสถิติภาพรวมของบอร์ด (จำนวนโน้ต, การกดชอบ, ความคิดเห็น)
 */
export async function getBoardStats(): Promise<{
  totalNotes: number;
  totalLikes: number;
  totalComments: number;
}> {
  const supabase = await createClient();
  const [notesRes, likesRes, commentsRes] = await Promise.all([
    supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("is_shared", true)
      .not("share_token", "is", null),
    supabase
      .from("note_reactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "like"),
    supabase
      .from("note_comments")
      .select("id", { count: "exact", head: true }),
  ]);

  return {
    totalNotes: notesRes.count || 0,
    totalLikes: likesRes.count || 0,
    totalComments: commentsRes.count || 0,
  };
}

/**
 * ดึง Top 3 Board (อันดับ 1, 2, 3 โน้ตที่มีคนกด "ชอบ" มากที่สุด)
 */
export async function getTopBoardNotes(): Promise<BoardNoteItem[]> {
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // ดึง likes ทั้งหมดของโน้ตที่แชร์
  const { data: allLikes, error: likesError } = await supabase
    .from("note_reactions")
    .select("note_id")
    .eq("type", "like");

  // นับจำนวน Like ต่อ Note ID
  const likeCounts: Record<string, number> = {};
  (allLikes || []).forEach((item) => {
    likeCounts[item.note_id] = (likeCounts[item.note_id] || 0) + 1;
  });

  // เรียงลำดับ note_id ตาม Like มากไปน้อย
  const sortedLikedNoteIds = Object.keys(likeCounts).sort(
    (a, b) => likeCounts[b] - likeCounts[a]
  );

  // ดึง Top notes
  let targetNoteIds = sortedLikedNoteIds.slice(0, 3);

  // หากมีโน้ตที่ถูก Like ไม่ถึง 3 รายการ ให้ดึงโน้ตที่แชร์ล่าสุดมาเติมให้ครบ 3
  if (targetNoteIds.length < 3) {
    const { data: recentNotes } = await supabase
      .from("notes")
      .select("id")
      .eq("is_shared", true)
      .not("share_token", "is", null)
      .order("created_at", { ascending: false })
      .limit(3);

    (recentNotes || []).forEach((rn) => {
      if (!targetNoteIds.includes(rn.id) && targetNoteIds.length < 3) {
        targetNoteIds.push(rn.id);
      }
    });
  }

  if (targetNoteIds.length === 0) return [];

  // ดึงข้อมูลเต็มของโน้ต Top 3
  const { data: rawNotes, error } = await supabase
    .from("notes")
    .select(
      `
      id,
      title,
      content,
      file_path,
      status,
      share_token,
      is_shared,
      created_at,
      updated_at,
      user_id,
      note_categories (
        id,
        name,
        pic,
        note_type
      )
    `
    )
    .in("id", targetNoteIds)
    .eq("is_shared", true);

  if (error || !rawNotes) return [];

  const userIds = Array.from(new Set(rawNotes.map((n) => n.user_id)));
  const profilesMap = new Map<string, any>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);
    (profiles || []).forEach((p) => profilesMap.set(p.id, p));
  }

  // ดึง reactions และ comments
  const { data: reactions } = await supabase
    .from("note_reactions")
    .select("note_id, user_id, type")
    .in("note_id", targetNoteIds);

  const likesMap = new Map<string, number>();
  const dislikesMap = new Map<string, number>();
  const userReactionsMap = new Map<string, "like" | "dislike">();

  (reactions || []).forEach((r) => {
    if (r.type === "like") {
      likesMap.set(r.note_id, (likesMap.get(r.note_id) || 0) + 1);
    } else if (r.type === "dislike") {
      dislikesMap.set(r.note_id, (dislikesMap.get(r.note_id) || 0) + 1);
    }
    if (currentUser && r.user_id === currentUser.id) {
      userReactionsMap.set(r.note_id, r.type as "like" | "dislike");
    }
  });

  const { data: comments } = await supabase
    .from("note_comments")
    .select("note_id")
    .in("note_id", targetNoteIds);

  const commentsMap = new Map<string, number>();
  (comments || []).forEach((c) => {
    commentsMap.set(c.note_id, (commentsMap.get(c.note_id) || 0) + 1);
  });

  // แปลงและจัดเรียงตาม Like Count มากไปน้อย
  const items: BoardNoteItem[] = rawNotes.map((n) => {
    const cat = Array.isArray(n.note_categories)
      ? n.note_categories[0]
      : n.note_categories;
    const authorProfile = profilesMap.get(n.user_id);

    return {
      id: n.id,
      title: n.title,
      content: n.content,
      file_path: n.file_path,
      status: n.status,
      share_token: n.share_token,
      is_shared: n.is_shared ?? true,
      isOwner: Boolean(currentUser && currentUser.id === n.user_id),
      created_at: n.created_at,
      updated_at: n.updated_at,
      user_id: n.user_id,
      category: cat || null,
      author: authorProfile || {
        id: n.user_id,
        username: "user",
        display_name: "ผู้ใช้งาน",
        avatar_type: "icon",
        avatar_icon: "User",
      },
      likeCount: likesMap.get(n.id) || 0,
      dislikeCount: dislikesMap.get(n.id) || 0,
      commentCount: commentsMap.get(n.id) || 0,
      currentUserReaction: userReactionsMap.get(n.id) || null,
    };
  });

  return items.sort((a, b) => b.likeCount - a.likeCount);
}

/**
 * กด Like หรือ Dislike ให้กับโน้ต
 */
export async function toggleNoteReaction(
  noteId: string,
  type: "like" | "dislike"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนกดชอบหรือไม่ชอบ");
  }

  // ตรวจสอบ reaction เดิม
  const { data: existingReaction } = await supabase
    .from("note_reactions")
    .select("id, type")
    .eq("note_id", noteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingReaction) {
    // ยังไม่เคย reaction -> เพิ่มใหม่
    const { error } = await supabase.from("note_reactions").insert({
      note_id: noteId,
      user_id: user.id,
      type,
    });
    if (error) throw new Error("ไม่สามารถบันทึก Reaction ได้: " + error.message);
  } else if (existingReaction.type === type) {
    // กดปุ่มเดิมซ้ำ -> ถอน Reaction ออก
    const { error } = await supabase
      .from("note_reactions")
      .delete()
      .eq("id", existingReaction.id);
    if (error) throw new Error("ไม่สามารถถอน Reaction ได้: " + error.message);
  } else {
    // สลับเป็นประเภทตรงข้าม (เช่น จาก like เป็น dislike)
    const { error } = await supabase
      .from("note_reactions")
      .update({ type })
      .eq("id", existingReaction.id);
    if (error) throw new Error("ไม่สามารถเปลี่ยน Reaction ได้: " + error.message);
  }

  revalidatePath("/board");
  return { success: true };
}

export interface NoteCommentItem {
  id: string;
  note_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    username: string;
    display_name?: string | null;
    avatar_type?: string | null;
    avatar_icon?: string | null;
    avatar_url?: string | null;
    instagram_url?: string | null;
    facebook_url?: string | null;
    youtube_url?: string | null;
    tiktok_url?: string | null;
  } | null;
  isOwner: boolean;
}

/**
 * ดึงความคิดเห็นทั้งหมดของโน้ต (Flat 1 ระดับ)
 */
export async function getNoteComments(noteId: string): Promise<NoteCommentItem[]> {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data: rawComments, error } = await supabase
    .from("note_comments")
    .select("*")
    .eq("note_id", noteId)
    .order("created_at", { ascending: true });

  if (error || !rawComments) return [];

  const userIds = Array.from(new Set(rawComments.map((c) => c.user_id)));
  const profilesMap = new Map<string, any>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);

    (profiles || []).forEach((p) => profilesMap.set(p.id, p));
  }

  return rawComments.map((c) => ({
    id: c.id,
    note_id: c.note_id,
    user_id: c.user_id,
    content: c.content,
    created_at: c.created_at,
    updated_at: c.updated_at,
    author: profilesMap.get(c.user_id) || {
      id: c.user_id,
      username: "user",
      display_name: "ผู้แสดงความคิดเห็น",
      avatar_type: "icon",
      avatar_icon: "User",
    },
    isOwner: Boolean(currentUser && currentUser.id === c.user_id),
  }));
}

/**
 * เพิ่มความคิดเห็นใหม่ในโน้ต
 */
export async function addNoteComment(noteId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น");

  const cleanContent = content?.trim();
  if (!cleanContent) throw new Error("กรุณากรอกข้อความความคิดเห็น");

  const { data, error } = await supabase
    .from("note_comments")
    .insert({
      note_id: noteId,
      user_id: user.id,
      content: cleanContent,
    })
    .select()
    .single();

  if (error) {
    console.error("Add comment error:", error);
    throw new Error("ไม่สามารถส่งความคิดเห็นได้: " + error.message);
  }

  revalidatePath("/board");
  return { success: true, comment: data };
}

/**
 * ลบความคิดเห็นของตัวเอง
 */
export async function deleteNoteComment(commentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

  const { error } = await supabase
    .from("note_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error("ลบความคิดเห็นไม่สำเร็จ: " + error.message);
  }

  revalidatePath("/board");
  return { success: true };
}

/**
 * แก้ไขโน้ตจากหน้ากระดานสนทนา (เฉพาะเจ้าของโน้ต)
 */
export async function updateBoardNote(
  noteId: string,
  payload: {
    title: string;
    content: string;
    status: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

  const { error } = await supabase
    .from("notes")
    .update({
      title: payload.title,
      content: payload.content,
      status: payload.status,
    })
    .eq("id", noteId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error("แก้ไขโน้ตไม่สำเร็จ: " + error.message);
  }

  revalidatePath("/board");
  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");
  return { success: true };
}

/**
 * ลบโน้ตจากหน้ากระดานสนทนา (เฉพาะเจ้าของโน้ต)
 */
export async function deleteBoardNote(noteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

  const { data: oldNote } = await supabase
    .from("notes")
    .select("file_path")
    .eq("id", noteId)
    .eq("user_id", user.id)
    .single();

  if (oldNote?.file_path) {
    await supabase.storage.from("note_attachments").remove([oldNote.file_path]);
  }

  await supabase
    .from("quality_transactions")
    .delete()
    .eq("note_id", noteId)
    .eq("user_id", user.id);

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error("ลบโน้ตไม่สำเร็จ: " + error.message);
  }

  revalidatePath("/board");
  revalidatePath("/notes");
  revalidatePath("/system/notes");
  revalidatePath("/system/notes/normal");
  revalidatePath("/system/notes/school");
  revalidatePath("/system/qualities");
  return { success: true };
}

/**
 * สลับสถานะเปิด/ปิดการแชร์ของโน้ตจากหน้ากระดานสนทนา (เฉพาะเจ้าของโน้ต)
 */
export async function toggleBoardNoteShare(noteId: string) {
  const { toggleShareNote } = await import("./share");
  return await toggleShareNote(noteId);
}
