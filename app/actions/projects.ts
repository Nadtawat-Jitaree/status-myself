'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from "@/lib/supabase/server";
import { redirect } from 'next/navigation';

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

  const { error } = await supabase
    .from('projects')
    .insert([{ user_id: user.id, name, description }])

  if (error) throw error
  revalidatePath('/system/projects')
}

export async function toggleTaskStatus(taskId: string, currentStatus: string, projectId: string) {
  const supabase = await createClient()
  const newStatus = currentStatus === 'done' ? 'todo' : 'done'

  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('id', taskId)

  if (error) throw error
  revalidatePath(`/system/projects/${projectId}`)
}

export async function createTask(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const title = formData.get('title') as string

  const { error } = await supabase
    .from('tasks')
    .insert([{ project_id: projectId, title }])

  if (error) throw error
  revalidatePath(`/system/projects/${projectId}`)
}

export async function updateTaskStatus(taskId: string, newStatus: string, projectId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('id', taskId)

  if (error) throw error
  revalidatePath(`/system/projects/${projectId}`)
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

  // ลบงานย่อยก่อนเพื่อความปลอดภัยหากฐานข้อมูลไม่ได้ตั้ง ON DELETE CASCADE
  await supabase.from('tasks').delete().eq('project_id', projectId)

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', user.id)
  
  if (error) throw error
  revalidatePath('/system/projects')
  redirect('/system/projects')
}

export async function deleteTask(taskId: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  
  if (error) throw error
  revalidatePath(`/system/projects/${projectId}`)
}

export async function updateTaskTitle(taskId: string, newTitle: string, projectId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .update({ title: newTitle })
    .eq('id', taskId)

  if (error) throw error
  revalidatePath(`/system/projects/${projectId}`)
}