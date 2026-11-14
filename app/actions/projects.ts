'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from "@/lib/supabase/server";
import { redirect } from 'next/navigation';
import {
  buildPaginationData,
  type PaginationData,
} from "@/lib/pagination";
import {
  awardTaskQualities,
  revokeTaskQualities,
  syncTaskQualities,
  SelectedQualityInput,
} from "./qualities";

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  due_date?: string | null;
  target_count?: number | null;
  target_label?: string | null;
  taskSummary: {
    total: number;
    done: number;
    progress: number;
  };
}

export interface ProjectsPagedResponse {
  projects: ProjectSummary[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  pagination: PaginationData;
  statusCounts: {
    all: number;
    in_progress: number;
    completed: number;
    empty: number;
  };
}

const PROJECTS_PAGE_SIZE = 9;

/**
 * ดึงรายการโปรเจกต์แบบแบ่งหน้า (Server-Side Pagination)
 * - ดึงมาแค่ pageSize โปรเจกต์ต่อหน้า
 * - คำนวณ task summary ที่ server ไม่ส่ง array ทั้งหมดมา client
 * - COUNT ผ่าน Supabase ไม่ต้องดึง row ทั้งหมด
 */
export async function getProjectsPaginated(params: {
  page?: number;
  search?: string;
  status?: 'all' | 'in_progress' | 'completed' | 'empty';
}): Promise<ProjectsPagedResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const page = Math.max(1, params.page || 1);
  const pageSize = PROJECTS_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  // ─── 1. ดึง status counts สำหรับ Filter Tab Badges (ดึงเฉพาะ id + task summary) ───
  const { data: allProjectsMeta } = await supabase
    .from('projects')
    .select('id, tasks(id, status)')
    .eq('user_id', user.id);

  // คำนวณ status counts สำหรับ Tab badges
  const statusCounts = { all: 0, in_progress: 0, completed: 0, empty: 0 };
  (allProjectsMeta || []).forEach((p: any) => {
    statusCounts.all++;
    const total = p.tasks?.length || 0;
    const done = p.tasks?.filter((t: any) => t.status === 'done').length || 0;
    if (total === 0) statusCounts.empty++;
    else if (done === total) statusCounts.completed++;
    else statusCounts.in_progress++;
  });

  // ─── 2. Build Query โปรเจกต์ตามหน้าและ filter ───
  let query = supabase
    .from('projects')
    .select('id, name, description, created_at, due_date, target_count, target_label, tasks(id, status)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Filter: Search
  if (params.search?.trim()) {
    const s = params.search.trim();
    query = (query as any).or(`name.ilike.%${s}%,description.ilike.%${s}%`);
  }

  const { data, count, error } = await query.range(offset, offset + pageSize - 1);
  if (error) throw error;

  // ─── 3. แปลง tasks → taskSummary ที่ server (ไม่ส่ง tasks array ไป client) ───
  let projects: ProjectSummary[] = (data || []).map((p: any) => {
    const total = p.tasks?.length || 0;
    const done = p.tasks?.filter((t: any) => t.status === 'done').length || 0;
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      created_at: p.created_at,
      due_date: p.due_date,
      target_count: p.target_count,
      target_label: p.target_label,
      taskSummary: { total, done, progress },
    };
  });

  // ─── 4. Client-side Status filter (ทำหลัง fetch เพราะต้องคำนวณ progress ก่อน) ───
  if (params.status && params.status !== 'all') {
    projects = projects.filter((p) => {
      const { total, done } = p.taskSummary;
      if (params.status === 'completed') return total > 0 && done === total;
      if (params.status === 'in_progress') return total === 0 || done < total;
      if (params.status === 'empty') return total === 0;
      return true;
    });
  }

  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    projects,
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
    pagination: buildPaginationData(page, totalCount, pageSize),
    statusCounts,
  };
}

export async function getProjects() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('projects')
    .select('*, tasks(id, status)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}


export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const targetLabel = (formData.get('target_label') as string)?.trim() || null
  const targetCountStr = formData.get('target_count') as string
  const targetCount = targetCountStr && !isNaN(Number(targetCountStr)) && Number(targetCountStr) > 0
    ? Math.floor(Number(targetCountStr))
    : null

  const { error } = await supabase
    .from('projects')
    .insert([{
      user_id: user.id,
      name,
      description,
      target_label: targetCount ? (targetLabel || 'ชิ้น') : null,
      target_count: targetCount
    }])

  if (error) throw error
  revalidatePath('/system/projects')
}

// Helper สำหรับตรวจสอบความเป็นเจ้าของโปรเจกต์ ป้องกัน IDOR/BOLA
async function verifyProjectOwnership(supabase: any, projectId: string, userId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();
  if (error || !data) {
    throw new Error('Unauthorized: คุณไม่มีสิทธิ์จัดการโปรเจกต์นี้');
  }
}

export async function toggleTaskStatus(taskId: string, currentStatus: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  await verifyProjectOwnership(supabase, projectId, user.id)

  const newStatus = currentStatus === 'done' ? 'todo' : 'done'

  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('id', taskId)
    .eq('project_id', projectId)

  if (error) throw error

  // จัดการแต้มคุณสมบัติตามสถานะใหม่
  if (newStatus === 'done') {
    await awardTaskQualities(taskId, projectId)
  } else {
    await revokeTaskQualities(taskId)
  }

  revalidatePath(`/system/projects/${projectId}`)
  revalidatePath('/system/qualities')
  revalidatePath('/system/dashboard')
}

export async function createTask(
  projectId: string,
  formData: FormData,
  selectedQualities?: SelectedQualityInput[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  await verifyProjectOwnership(supabase, projectId, user.id)

  const title = formData.get('title') as string
  const description = (formData.get('description') as string)?.trim() || null
  const priority = (formData.get('priority') as string) || 'medium'
  const statusRaw = (formData.get('status') as string) || 'todo'
  const status = ['todo', 'in_progress', 'done'].includes(statusRaw) ? statusRaw : 'todo'
  const dueDateStr = formData.get('due_date') as string
  const due_date = dueDateStr && dueDateStr.trim() !== '' ? new Date(dueDateStr).toISOString() : null

  // หา order_index สูงสุด
  const { data: lastTask } = await supabase
    .from('tasks')
    .select('order_index')
    .eq('project_id', projectId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (lastTask?.order_index ?? 0) + 1

  const { data: inserted, error } = await supabase
    .from('tasks')
    .insert([
      {
        project_id: projectId,
        title,
        description,
        priority,
        status,
        due_date,
        order_index: nextOrder,
      },
    ])
    .select('id')
    .single()

  if (error) throw error

  const newTaskId = inserted?.id

  // Sync qualities หากมีการเลือก
  if (newTaskId && selectedQualities && selectedQualities.length > 0) {
    await syncTaskQualities(newTaskId, selectedQualities, projectId)
  }

  // หากสร้าง task ในสถานะ done และมี qualities ให้ award ทันที
  if (newTaskId && status === 'done') {
    await awardTaskQualities(newTaskId, projectId)
  }

  revalidatePath(`/system/projects/${projectId}`)
  revalidatePath('/system/qualities')
  revalidatePath('/system/dashboard')
}

export async function updateTaskStatus(taskId: string, newStatus: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  await verifyProjectOwnership(supabase, projectId, user.id)

  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('id', taskId)
    .eq('project_id', projectId)

  if (error) throw error

  // จัดการแต้มคุณสมบัติตามสถานะใหม่
  if (newStatus === 'done') {
    await awardTaskQualities(taskId, projectId)
  } else {
    await revokeTaskQualities(taskId)
  }

  revalidatePath(`/system/projects/${projectId}`)
  revalidatePath('/system/qualities')
  revalidatePath('/system/dashboard')
}

export async function updateProject(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const name = formData.get('name') as string
  const description = formData.get('description') as string

  const { error } = await supabase
    .from('projects')
    .update({ name, description })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) throw error
  revalidatePath(`/system/projects/${projectId}`)
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // ลบ transactions ที่ผูกกับ project นี้ก่อนลบ project
  await supabase
    .from('quality_transactions')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', user.id)

  // ลบงานย่อยก่อนเพื่อความปลอดภัยหากฐานข้อมูลไม่ได้ตั้ง ON DELETE CASCADE
  await supabase.from('tasks').delete().eq('project_id', projectId)

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', user.id)
  
  if (error) throw error
  revalidatePath('/system/projects')
  revalidatePath('/system/qualities')
  revalidatePath('/system/dashboard')
  redirect('/system/projects')
}

export async function deleteTask(taskId: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  await verifyProjectOwnership(supabase, projectId, user.id)

  // คืนค่าแต้มหากงานนี้เคยทำเสร็จไปแล้ว
  await revokeTaskQualities(taskId)

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('project_id', projectId)
  
  if (error) throw error
  revalidatePath(`/system/projects/${projectId}`)
  revalidatePath('/system/qualities')
  revalidatePath('/system/dashboard')
}

export async function updateTaskTitle(taskId: string, newTitle: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  await verifyProjectOwnership(supabase, projectId, user.id)

  const { error } = await supabase
    .from('tasks')
    .update({ title: newTitle })
    .eq('id', taskId)
    .eq('project_id', projectId)

  if (error) throw error
  revalidatePath(`/system/projects/${projectId}`)
}

export async function updateTaskDetails(
  taskId: string,
  projectId: string,
  payload: {
    title?: string;
    description?: string | null;
    priority?: string;
    due_date?: string | null;
    selectedQualities?: SelectedQualityInput[];
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  await verifyProjectOwnership(supabase, projectId, user.id)

  const updateFields: any = {}
  if (payload.title !== undefined) updateFields.title = payload.title
  if (payload.description !== undefined) updateFields.description = payload.description
  if (payload.priority !== undefined) updateFields.priority = payload.priority
  if (payload.due_date !== undefined) updateFields.due_date = payload.due_date

  if (Object.keys(updateFields).length > 0) {
    const { error } = await supabase
      .from('tasks')
      .update(updateFields)
      .eq('id', taskId)
      .eq('project_id', projectId)

    if (error) throw error
  }

  // หากมีการส่ง selectedQualities มา ให้ซิงค์ข้อมูลคุณสมบัติ
  if (payload.selectedQualities !== undefined) {
    await syncTaskQualities(taskId, payload.selectedQualities, projectId)
  }

  revalidatePath(`/system/projects/${projectId}`)
  revalidatePath('/system/qualities')
  revalidatePath('/system/dashboard')
}

export async function reorderTasks(
  projectId: string,
  taskOrders: { id: string; order_index: number }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  await verifyProjectOwnership(supabase, projectId, user.id)

  // Hash Map สำหรับตรวจสอบความถูกต้องและ Deduplication ของ Task IDs ใน O(1)
  const taskMap = new Map<string, number>()
  taskOrders.forEach((task) => {
    if (task.id) taskMap.set(task.id, task.order_index)
  })

  // อัปเดต order_index พร้อมจำกัดขอบเขต project_id เพิ่มความปลอดภัย
  const promises = Array.from(taskMap.entries()).map(([taskId, orderIndex]) =>
    supabase
      .from('tasks')
      .update({ order_index: orderIndex })
      .eq('id', taskId)
      .eq('project_id', projectId)
  )

  await Promise.all(promises)
  revalidatePath(`/system/projects/${projectId}`)
}

export async function updateProjectTarget(
  projectId: string,
  payload: { target_count: number | null; target_label?: string | null }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const updateData: any = {
    target_count: payload.target_count,
    target_label: payload.target_label ?? null,
  }

  const { error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) throw error
  revalidatePath(`/system/projects/${projectId}`)
  revalidatePath('/system/projects')
}
