'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from "@/lib/supabase/server"

export interface DailyLog {
  id: string
  user_id: string
  date: string
  summary: string | null
  mood: string | null
  created_at: string
  updated_at: string
}

export interface LogItem {
  id: string
  daily_log_id: string | null
  user_id: string
  date: string
  title: string
  description: string | null
  category: string
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  start_time: string | null
  end_time: string | null
  tags: string[]
  created_at: string
  completed_at: string | null
}

export interface CalendarMonthResponse {
  year: number
  month: number
  dailyLogs: Record<string, DailyLog>
  logItems: Record<string, LogItem[]>
  allCategories: string[]
  allTags: string[]
}

// 1. ดึงข้อมูลปฏิทินทั้งเดือนตาม Filter
export async function getCalendarMonthData(
  year: number,
  month: number, // 1-12
  filters?: {
    category?: string
    status?: string
    tag?: string
    search?: string
  }
): Promise<CalendarMonthResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // คำนวณวันเริ่มต้นและสิ้นสุดของเดือน (รวม buffer ขอบเดือนเพื่อแสดงในปฏิทิน 42 ช่อง)
  const startDate = new Date(Date.UTC(year, month - 1, 1))
  startDate.setDate(startDate.getDate() - 7) // เผื่ออาทิตย์ก่อนหน้า
  const endDate = new Date(Date.UTC(year, month, 0))
  endDate.setDate(endDate.getDate() + 7) // เผื่ออาทิตย์ถัดไป

  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  // Query Daily Logs
  const { data: dailyLogsData, error: logsError } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDateStr)
    .lte('date', endDateStr)

  if (logsError) throw logsError

  // Query Log Items พร้อม filter
  let query = supabase
    .from('log_items')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDateStr)
    .lte('date', endDateStr)
    .order('created_at', { ascending: true })

  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters?.tag && filters.tag !== 'all') {
    query = query.contains('tags', [filters.tag])
  }

  if (filters?.search && filters.search.trim() !== '') {
    query = query.ilike('title', `%${filters.search.trim()}%`)
  }

  const { data: itemsData, error: itemsError } = await query
  if (itemsError) throw itemsError

  // จัดกลุ่มข้อมูลตาม Date
  const dailyLogs: Record<string, DailyLog> = {}
  dailyLogsData?.forEach((log) => {
    dailyLogs[log.date] = log
  })

  const logItems: Record<string, LogItem[]> = {}
  const categorySet = new Set<string>()
  const tagSet = new Set<string>()

  itemsData?.forEach((item) => {
    if (!logItems[item.date]) {
      logItems[item.date] = []
    }
    logItems[item.date].push(item)

    if (item.category) categorySet.add(item.category)
    if (Array.isArray(item.tags)) {
      item.tags.forEach((t: string) => tagSet.add(t))
    }
  })

  return {
    year,
    month,
    dailyLogs,
    logItems,
    allCategories: Array.from(categorySet),
    allTags: Array.from(tagSet),
  }
}

// 2. ดึงรายละเอียดของวันนั้นๆ
export async function getDayDetails(dateStr: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: dailyLog } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', dateStr)
    .maybeSingle()

  const { data: items, error } = await supabase
    .from('log_items')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', dateStr)
    .order('created_at', { ascending: true })

  if (error) throw error

  return {
    dailyLog: dailyLog || null,
    items: items || [],
  }
}

// 3. บันทึก / อัปเดต Daily Log (Note สรุป / Mood)
export async function upsertDailyLog(payload: {
  date: string
  summary?: string
  mood?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('daily_logs')
    .upsert(
      {
        user_id: user.id,
        date: payload.date,
        summary: payload.summary,
        mood: payload.mood,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error) throw error
  revalidatePath('/system/calendar')
  return data
}

// 4. เพิ่ม Log Item (กิจกรรม / งานที่ต้องทำในวันนั้น)
export async function createLogItem(payload: {
  date: string
  title: string
  description?: string
  category?: string
  priority?: 'low' | 'medium' | 'high'
  tags?: string[]
  start_time?: string | null
  end_time?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // ตรวจสอบหรือสร้าง daily_log ของวันนั้นก่อน (ถ้ายังไม่มี)
  let dailyLogId: string | null = null
  const { data: existingLog } = await supabase
    .from('daily_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', payload.date)
    .maybeSingle()

  if (existingLog) {
    dailyLogId = existingLog.id
  } else {
    const { data: newLog } = await supabase
      .from('daily_logs')
      .insert({ user_id: user.id, date: payload.date })
      .select('id')
      .single()
    if (newLog) dailyLogId = newLog.id
  }

  const { data, error } = await supabase
    .from('log_items')
    .insert({
      daily_log_id: dailyLogId,
      user_id: user.id,
      date: payload.date,
      title: payload.title.trim(),
      description: payload.description || null,
      category: payload.category || 'general',
      priority: payload.priority || 'medium',
      status: 'todo',
      tags: payload.tags || [],
      start_time: payload.start_time || null,
      end_time: payload.end_time || null,
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/system/calendar')
  return data
}

// 5. สลับสถานะ Todo <-> Completed
export async function toggleLogItemStatus(itemId: string, currentStatus: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const isCompleted = currentStatus === 'completed'
  const newStatus = isCompleted ? 'todo' : 'completed'
  const completed_at = isCompleted ? null : new Date().toISOString()

  const { data, error } = await supabase
    .from('log_items')
    .update({
      status: newStatus,
      completed_at: completed_at,
    })
    .eq('id', itemId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/system/calendar')
  return data
}

// 6. ลบ Log Item
export async function deleteLogItem(itemId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('log_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', user.id)

  if (error) throw error
  revalidatePath('/system/calendar')
  return { success: true }
}

// 7. แก้ไข Log Item
export async function updateLogItem(itemId: string, updates: Partial<LogItem>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('log_items')
    .update(updates)
    .eq('id', itemId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/system/calendar')
  return data
}

// 8. ยกยอดงานที่ยังไม่เสร็จ (Carry over unfinished tasks to target date)
export async function carryOverUnfinishedTasks(sourceDate: string, targetDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // ดึงรายการที่ยังเป็น 'todo' หรือ 'in_progress' ใน sourceDate
  const { data: unfinished, error } = await supabase
    .from('log_items')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', sourceDate)
    .in('status', ['todo', 'in_progress'])

  if (error) throw error
  if (!unfinished || unfinished.length === 0) return { movedCount: 0 }

  // สร้างหรือหา daily_log ของ targetDate
  let targetDailyLogId: string | null = null
  const { data: targetLog } = await supabase
    .from('daily_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', targetDate)
    .maybeSingle()

  if (targetLog) {
    targetDailyLogId = targetLog.id
  } else {
    const { data: newLog } = await supabase
      .from('daily_logs')
      .insert({ user_id: user.id, date: targetDate })
      .select('id')
      .single()
    if (newLog) targetDailyLogId = newLog.id
  }

  // สร้างสำเนารายการไปยัง targetDate
  const itemsToInsert = unfinished.map((item) => ({
    user_id: user.id,
    daily_log_id: targetDailyLogId,
    date: targetDate,
    title: item.title,
    description: item.description,
    category: item.category,
    priority: item.priority,
    status: 'todo',
    tags: item.tags,
  }))

  const { error: insertError } = await supabase
    .from('log_items')
    .insert(itemsToInsert)

  if (insertError) throw insertError

  // ปรับสถานะในวันเดิมเป็น 'cancelled' หรือจะลบออกเพื่อไม่ให้ซ้ำซ้อน
  const oldIds = unfinished.map((i) => i.id)
  await supabase
    .from('log_items')
    .update({ status: 'cancelled' })
    .in('id', oldIds)

  revalidatePath('/system/calendar')
  return { movedCount: unfinished.length }
}
