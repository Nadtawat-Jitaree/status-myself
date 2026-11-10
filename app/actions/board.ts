"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  type PaginationItem,
  type PaginationData,
  buildPaginationData,
} from "@/lib/pagination";

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
  pagination: PaginationData;
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
  currentUserId?: string;
}): Promise<BoardResponse> {
  const page = Math.max(1, params.page || 1);
  const limit = params.limit || 9;
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  // ดึง Current User (ถ้ามีการส่งมาแล้วไม่ต้อง query ซ้ำ)
  let resolvedUserId = params.currentUserId;
  if (resolvedUserId === undefined) {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    resolvedUserId = currentUser?.id;
  }

  // หากเลือก filter 'mine' แต่ยังไม่ได้เข้าสู่ระบบ ให้ส่งผลลัพธ์ว่างกลับไป
  if (params.filter === "mine" && !resolvedUserId) {
    return {
      notes: [],
      totalCount: 0,
      currentPage: page,
      totalPages: 1,
      pageSize: limit,
      pagination: buildPaginationData(page, 0, limit),
    };
  }

  // 1. Query โน้ตบนกระดาน
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

  if (params.filter === "mine" && resolvedUserId) {
    query = query.eq("user_id", resolvedUserId);

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

  // คอลัมน์ของ profile ที่จำเป็นสำหรับ Author badge (ลด DB payload)
  const PROFILE_COLUMNS = "id, username, display_name, avatar_type, avatar_icon, avatar_url, instagram_url, facebook_url, youtube_url, tiktok_url, created_at";

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
        pagination: buildPaginationData(page, 0, limit),
      };
    }

    const candidateNotes = data;
    const totalCount = c || candidateNotes.length;
    const candidateIds = candidateNotes.map((n) => n.id);

    // ดึง reactions และ comments เฉพาะ candidateIds เพื่อคำนวณคะแนน
    const [reactionsRes, commentsRes] = await Promise.all([
      candidateIds.length > 0
        ? supabase
            .from("note_reactions")
            .select("note_id, user_id, type")
            .in("note_id", candidateIds)
        : Promise.resolve({ data: [] }),
      candidateIds.length > 0
        ? supabase
            .from("note_comments")
            .select("note_id")
            .in("note_id", candidateIds)
        : Promise.resolve({ data: [] }),
    ]);

    const likesMap = new Map<string, number>();
    const dislikesMap = new Map<string, number>();
    const userReactionsMap = new Map<string, "like" | "dislike">();

    (reactionsRes.data || []).forEach((r: any) => {
      if (r.type === "like") {
        likesMap.set(r.note_id, (likesMap.get(r.note_id) || 0) + 1);
      } else if (r.type === "dislike") {
        dislikesMap.set(r.note_id, (dislikesMap.get(r.note_id) || 0) + 1);
      }

      if (resolvedUserId && r.user_id === resolvedUserId) {
        userReactionsMap.set(r.note_id, r.type as "like" | "dislike");
      }
    });

    const commentsMap = new Map<string, number>();
    (commentsRes.data || []).forEach((c: any) => {
      commentsMap.set(c.note_id, (commentsMap.get(c.note_id) || 0) + 1);
    });

    // เรียงลำดับ candidateNotes
    if (params.sortBy === "popular") {
      candidateNotes.sort(
        (a, b) =>
          (likesMap.get(b.id) || 0) - (likesMap.get(a.id) || 0) ||
          (commentsMap.get(b.id) || 0) - (commentsMap.get(a.id) || 0)
      );
    } else if (params.sortBy === "comments") {
      candidateNotes.sort(
        (a, b) =>
          (commentsMap.get(b.id) || 0) - (commentsMap.get(a.id) || 0) ||
          (likesMap.get(b.id) || 0) - (likesMap.get(a.id) || 0)
      );
    }

    // Performance Optimization: Slice หน้าปัจจุบันก่อน แล้วดึง Profiles เฉพาะหน้าที่มี 9 รายการ!
    const pagedRawNotes = candidateNotes.slice(offset, offset + limit);
    const pagedUserIds = Array.from(new Set(pagedRawNotes.map((n) => n.user_id)));

    const profilesRes = pagedUserIds.length > 0
      ? await supabase.from("profiles").select(PROFILE_COLUMNS).in("id", pagedUserIds)
      : { data: [] };

    const profilesMap = new Map<string, any>();
    (profilesRes.data || []).forEach((p: any) => profilesMap.set(p.id, p));

    const notes: BoardNoteItem[] = pagedRawNotes.map((n) => {
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
        isOwner: Boolean(resolvedUserId && resolvedUserId === n.user_id),
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

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return {
      notes,
      totalCount,
      currentPage: page,
      totalPages,
      pageSize: limit,
      pagination: buildPaginationData(page, totalCount, limit),
    };
  }

  // ─── Default Sort (เรียงจากล่าสุด) ───
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
      pagination: buildPaginationData(page, 0, limit),
    };
  }

  const rawNotes = data;
  const totalCount = c || 0;
  const noteIds = rawNotes.map((n) => n.id);
  const userIds = Array.from(new Set(rawNotes.map((n) => n.user_id)));

  // ดึงข้อมูล Authors (Profiles), Reactions และ Comments แบบ Parallel เฉพาะ 9 รายการ
  const [profilesRes, reactionsRes, commentsRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select(PROFILE_COLUMNS).in("id", userIds)
      : Promise.resolve({ data: [] }),
    noteIds.length > 0
      ? supabase
          .from("note_reactions")
          .select("note_id, user_id, type")
          .in("note_id", noteIds)
      : Promise.resolve({ data: [] }),
    noteIds.length > 0
      ? supabase
          .from("note_comments")
          .select("note_id")
          .in("note_id", noteIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profilesMap = new Map<string, any>();
  (profilesRes.data || []).forEach((p: any) => profilesMap.set(p.id, p));

  const likesMap = new Map<string, number>();
  const dislikesMap = new Map<string, number>();
  const userReactionsMap = new Map<string, "like" | "dislike">();

  (reactionsRes.data || []).forEach((r: any) => {
    if (r.type === "like") {
      likesMap.set(r.note_id, (likesMap.get(r.note_id) || 0) + 1);
    } else if (r.type === "dislike") {
      dislikesMap.set(r.note_id, (dislikesMap.get(r.note_id) || 0) + 1);
    }

    if (resolvedUserId && r.user_id === resolvedUserId) {
      userReactionsMap.set(r.note_id, r.type as "like" | "dislike");
    }
  });

  const commentsMap = new Map<string, number>();
  (commentsRes.data || []).forEach((c: any) => {
    commentsMap.set(c.note_id, (commentsMap.get(c.note_id) || 0) + 1);
  });

  const notes: BoardNoteItem[] = rawNotes.map((n) => {
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
      isOwner: Boolean(resolvedUserId && resolvedUserId === n.user_id),
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

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    notes,
    totalCount,
    currentPage: page,
    totalPages,
    pageSize: limit,
    pagination: buildPaginationData(page, totalCount, limit),
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

  // 1. ดึงโน้ตที่เปิดแชร์สาธารณะล่าสุดเป็นกลุ่มตัวเลือก Top Board (หลีกเลี่ยง Full Table Scan บน note_reactions ทั้งระบบ)
  const { data: candidateSharedNotes } = await supabase
    .from("notes")
    .select("id")
    .eq("is_shared", true)
    .not("share_token", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!candidateSharedNotes || candidateSharedNotes.length === 0) return [];
  const candidateIds = candidateSharedNotes.map((n) => n.id);

  // ดึง likes เฉพาะกลุ่มโน้ตที่เปิดแชร์
  const { data: candidateLikes } = await supabase
    .from("note_reactions")
    .select("note_id")
    .eq("type", "like")
    .in("note_id", candidateIds);

  // นับจำนวน Like ต่อ Note ID
  const likeCounts: Record<string, number> = {};
  (candidateLikes || []).forEach((item) => {
    likeCounts[item.note_id] = (likeCounts[item.note_id] || 0) + 1;
  });

  // เรียงลำดับ note_id ตาม Like มากไปน้อย
  const sortedLikedNoteIds = [...candidateIds].sort(
    (a, b) => (likeCounts[b] || 0) - (likeCounts[a] || 0)
  );

  // ดึง Top 3 notes
  const targetNoteIds = sortedLikedNoteIds.slice(0, 3);
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

  // ดึง Profiles, Reactions และ Comments ของ Top 3 แบบ Parallel เพื่อความเร็วสูงสุด
  const [profilesRes, reactionsRes, commentsRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("*").in("id", userIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("note_reactions")
      .select("note_id, user_id, type")
      .in("note_id", targetNoteIds),
    supabase
      .from("note_comments")
      .select("note_id")
      .in("note_id", targetNoteIds),
  ]);

  const profilesMap = new Map<string, any>();
  (profilesRes.data || []).forEach((p: any) => profilesMap.set(p.id, p));

  const likesMap = new Map<string, number>();
  const dislikesMap = new Map<string, number>();
  const userReactionsMap = new Map<string, "like" | "dislike">();

  (reactionsRes.data || []).forEach((r: any) => {
    if (r.type === "like") {
      likesMap.set(r.note_id, (likesMap.get(r.note_id) || 0) + 1);
    } else if (r.type === "dislike") {
      dislikesMap.set(r.note_id, (dislikesMap.get(r.note_id) || 0) + 1);
    }
    if (currentUser && r.user_id === currentUser.id) {
      userReactionsMap.set(r.note_id, r.type as "like" | "dislike");
    }
  });

  const commentsMap = new Map<string, number>();
  (commentsRes.data || []).forEach((c: any) => {
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
 * ดึงความคิดเห็นของโน้ต พร้อมรองรับการแบ่งหน้า (Pagination) หรือดึงทั้งหมด
 */
export async function getNoteComments(
  noteId: string,
  params?: { limit?: number; offset?: number }
): Promise<NoteCommentItem[]> {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("note_comments")
    .select("*")
    .eq("note_id", noteId)
    .order("created_at", { ascending: true });

  if (params?.limit) {
    const offset = params.offset || 0;
    query = query.range(offset, offset + params.limit - 1);
  }

  const { data: rawComments, error } = await query;

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
