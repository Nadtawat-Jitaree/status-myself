"use client"

import React, { useState, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Plus,
  Pencil,
  Loader2,
  CheckCircle2,
  Circle,
  Trash2,
  Smile,
  Target,
  Coffee,
  BatteryLow,
  Flame,
  ArrowRight,
  Clock,
  NotebookPen,
  Save,
  Check,
  Tag as TagIcon,
  AlertCircle
} from 'lucide-react'
import Swal from 'sweetalert2'
import {
  DailyLog,
  LogItem,
  upsertDailyLog,
  createLogItem,
  toggleLogItemStatus,
  deleteLogItem,
  updateLogItem,
  carryOverUnfinishedTasks,
} from '@/app/actions/calendar'
import { getCategoryStyle } from './CalendarFilters'

interface DayDetailModalProps {
  isOpen: boolean
  dateStr: string // YYYY-MM-DD
  dailyLog: DailyLog | null
  items: LogItem[]
  onClose: () => void
  onRefresh: () => void
}

const MOODS = [
  { id: 'happy', label: 'สดใส', icon: Smile, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200' },
  { id: 'productive', label: 'สำเร็จลุล่วง', icon: Target, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' },
  { id: 'relaxed', label: 'สบายๆ', icon: Coffee, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200' },
  { id: 'tired', label: 'เหนื่อยล้า', icon: BatteryLow, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200' },
  { id: 'focused', label: 'มุ่งมั่นไฟแรง', icon: Flame, color: 'text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200' },
]

export default function DayDetailModal({
  isOpen,
  dateStr,
  dailyLog,
  items,
  onClose,
  onRefresh,
}: DayDetailModalProps) {
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [summary, setSummary] = useState(dailyLog?.summary || '')
  const [selectedMood, setSelectedMood] = useState(dailyLog?.mood || '')
  const [isSavedSummary, setIsSavedSummary] = useState(false)

  // Quick Add Item States
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newTags, setNewTags] = useState('')
  const [newStartTime, setNewStartTime] = useState('')
  const [newEndTime, setNewEndTime] = useState('')
  const [showAdvancedAdd, setShowAdvancedAdd] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('general')
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [editTags, setEditTags] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [itemAction, setItemAction] = useState<{
    itemId: string
    action: 'complete' | 'delete' | 'edit'
  } | null>(null)
  const [isCarryingOver, setIsCarryingOver] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync state when dailyLog or dateStr changes
  useEffect(() => {
    setSummary(dailyLog?.summary || '')
    setSelectedMood(dailyLog?.mood || '')
    setIsSavedSummary(false)
  }, [dailyLog, dateStr])

  if (!isOpen || !mounted) return null

  // Format Thai Date
  const dateObj = new Date(dateStr + 'T00:00:00')
  const thaiDateFormatted = dateObj.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Handle Mood change
  const handleMoodSelect = (moodId: string) => {
    const nextMood = selectedMood === moodId ? '' : moodId
    setSelectedMood(nextMood)
    startTransition(async () => {
      await upsertDailyLog({
        date: dateStr,
        summary: summary,
        mood: nextMood,
      })
      onRefresh()
    })
  }

  // Handle Save Note / Reflection
  const handleSaveSummary = () => {
    startTransition(async () => {
      await upsertDailyLog({
        date: dateStr,
        summary: summary,
        mood: selectedMood,
      })
      setIsSavedSummary(true)
      setTimeout(() => setIsSavedSummary(false), 2000)
      onRefresh()
    })
  }

  // Handle Add Item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const parsedTags = newTags
      ? newTags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean)
      : []

    startTransition(async () => {
      await createLogItem({
        date: dateStr,
        title: newTitle.trim(),
        category: newCategory,
        priority: newPriority,
        tags: parsedTags,
        start_time: newStartTime || null,
        end_time: newEndTime || null,
      })
      setNewTitle('')
      setNewTags('')
      setNewStartTime('')
      setNewEndTime('')
      setShowAdvancedAdd(false)
      onRefresh()
    })
  }

  // Handle Toggle Item
  const handleToggleItem = (item: LogItem) => {
    runItemAction(item, 'complete', () => toggleLogItemStatus(item.id, item.status))
  }

  // Handle Delete Item
  const handleDeleteItem = async (itemId: string) => {
    const result = await Swal.fire({
      title: 'ลบกิจกรรมนี้?',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบรายการ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
    })

    if (result.isConfirmed) {
      const item = items.find((currentItem) => currentItem.id === itemId)
      if (item) runItemAction(item, 'delete', () => deleteLogItem(itemId))
    }
  }

  const runItemAction = (
    item: LogItem,
    action: 'complete' | 'delete' | 'edit',
    operation: () => Promise<unknown>
  ) => {
    setItemAction({ itemId: item.id, action })
    startTransition(async () => {
      try {
        await operation()
        await onRefresh()
        if (action === 'edit') setEditingItemId(null)
      } catch (error) {
        console.error(`Failed to ${action} calendar item`, error)
        await Swal.fire({
          icon: 'error',
          title: 'ดำเนินการไม่สำเร็จ',
          text: 'กรุณาลองอีกครั้ง',
        })
      } finally {
        setItemAction(null)
      }
    })
  }

  const handleStartEdit = (item: LogItem) => {
    setEditingItemId(item.id)
    setEditTitle(item.title)
    setEditCategory(item.category)
    setEditPriority(item.priority)
    setEditTags(item.tags.join(', '))
    setEditStartTime(item.start_time?.slice(0, 5) || '')
    setEditEndTime(item.end_time?.slice(0, 5) || '')
  }

  const handleSaveItem = (item: LogItem) => {
    if (!editTitle.trim()) return

    const tags = editTags
      .split(',')
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter(Boolean)

    runItemAction(item, 'edit', () =>
      updateLogItem(item.id, {
        title: editTitle.trim(),
        category: editCategory,
        priority: editPriority,
        tags,
        start_time: editStartTime || null,
        end_time: editEndTime || null,
      })
    )
  }

  // Handle Carry-over Unfinished Tasks to Tomorrow
  const handleCarryOver = async () => {
    const tomorrow = new Date(dateObj)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

    const result = await Swal.fire({
      title: 'ยกยอดงานไปวันพรุ่งนี้?',
      text: `จะย้ายงานที่ยังไม่ได้ทำไปวันที่ ${tomorrow.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ยกยอดเลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#3b82f6',
    })

    if (result.isConfirmed) {
      setIsCarryingOver(true)
      startTransition(async () => {
        try {
          const res = await carryOverUnfinishedTasks(dateStr, tomorrowStr)
          await Swal.fire({
            icon: 'success',
            title: 'ยกยอดสำเร็จ!',
            text: `ย้ายงานทั้งหมด ${res.movedCount} รายการเรียบร้อย`,
            timer: 1500,
            showConfirmButton: false,
          })
          await onRefresh()
        } catch (error) {
          console.error('Failed to carry over calendar items', error)
          await Swal.fire({
            icon: 'error',
            title: 'ยกยอดไม่สำเร็จ',
            text: 'กรุณาลองอีกครั้ง',
          })
        } finally {
          setIsCarryingOver(false)
        }
      })
    }
  }

  const completedCount = items.filter((i) => i.status === 'completed').length
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const unfinishedCount = items.filter((i) => i.status === 'todo' || i.status === 'in_progress').length

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col max-h-[90vh] w-full max-w-2xl rounded-3xl border bg-card shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4 bg-muted/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Daily Workspace
              </span>
              <span className="text-[11px] sm:text-xs text-muted-foreground">{dateStr}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
              {thaiDateFormatted}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 sm:p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
          {/* Section 1: Mood Tracker */}
          <div className="rounded-2xl border bg-card/80 p-3 sm:p-4 shadow-sm">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
              ความรู้สึก / Mood วันนี้
            </span>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {MOODS.map((m) => {
                const Icon = m.icon
                const isSelected = selectedMood === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => handleMoodSelect(m.id)}
                    className={`flex flex-col items-center justify-center gap-1 sm:gap-1.5 rounded-xl border p-1.5 sm:p-2.5 ${
                      isSelected
                        ? `${m.color} ring-2 ring-primary/40 font-bold shadow-sm`
                        : 'border-border/60 hover:border-border hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="text-[10px] sm:text-[11px] truncate w-full text-center">{m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 2: Daily Note / Reflection */}
          <div className="rounded-2xl border bg-card/80 p-3 sm:p-4 shadow-sm space-y-2 sm:space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 truncate">
                <NotebookPen className="h-3.5 w-3.5 text-black shrink-0" />
                <span className="truncate">บันทึกสรุปประจำวัน (Daily Notes)</span>
              </span>
              <button
                onClick={handleSaveSummary}
                disabled={isPending}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 shrink-0"
              >
                {isSavedSummary ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" /> บันทึกแล้ว
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> บันทึก
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={3}
              placeholder="วันนี้ทำอะไรไปบ้าง มีอะไรที่น่าประทับใจ หรือสิ่งที่ได้เรียนรู้ในวันนี้..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full rounded-xl border bg-background p-2.5 sm:p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Section 3: Activities & Tasks List */}
          <div className="space-y-3 sm:space-y-4">
            {/* Header & Progress */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  สิ่งที่ทำ / รายการงาน ({completedCount}/{totalCount})
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  ติ๊กเครื่องหมายเพื่อบันทึกว่าทำเสร็จแล้ว
                </p>
              </div>

              {/* Carry Over Button (ถ้ามีงานค้าง) */}
              {unfinishedCount > 0 && (
                <button
                  onClick={handleCarryOver}
                  disabled={isPending}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 disabled:opacity-50 w-full sm:w-auto"
                >
                  {isCarryingOver ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                  {isCarryingOver ? 'กำลังยกยอด...' : `ยกยอดค้าง ${unfinishedCount} รายการไปพรุ่งนี้`}
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {totalCount > 0 && (
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* Add Task Input Form */}
            <form onSubmit={handleAddItem} className="rounded-2xl border bg-muted/40 p-2.5 sm:p-3 space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="+ เพิ่มกิจกรรมหรือสิ่งที่ต้องทำ..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="flex-1 rounded-xl border bg-background px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="submit"
                  disabled={!newTitle.trim() || isPending}
                  className="flex items-center justify-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 shrink-0"
                >
                  <Plus className="h-4 w-4" /> เพิ่ม
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="rounded-lg border bg-background px-2 py-1 font-medium text-foreground focus:outline-none"
                  >
                    <option value="general">หมวดทั่วไป</option>
                    <option value="work">งาน (Work)</option>
                    <option value="study">เรียน (Study)</option>
                    <option value="exercise">ออกกำลังกาย</option>
                    <option value="personal">ส่วนตัว</option>
                  </select>

                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="rounded-lg border bg-background px-2 py-1 font-medium text-foreground focus:outline-none"
                  >
                    <option value="low">ความสำคัญ: ต่ำ</option>
                    <option value="medium">ความสำคัญ: ปานกลาง</option>
                    <option value="high">ความสำคัญ: สูง</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvancedAdd(!showAdvancedAdd)}
                  className="text-muted-foreground hover:text-foreground text-[11px]"
                >
                  {showAdvancedAdd ? 'ซ่อนตัวเลือกเวลา/แท็ก' : '+ เพิ่มเวลา/แท็ก'}
                </button>
              </div>

              {showAdvancedAdd && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="rounded-md border bg-background px-2 py-1 text-xs"
                    />
                    <span>ถึง</span>
                    <input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      className="rounded-md border bg-background px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-1 min-w-[150px]">
                    <TagIcon className="h-3.5 w-3.5" />
                    <input
                      type="text"
                      placeholder="แท็ก คั่นด้วยจุลภาค เช่น coding, meeting"
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      className="w-full rounded-md border bg-background px-2 py-1 text-xs"
                    />
                  </div>
                </div>
              )}
            </form>

            {/* List of Task Items */}
            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-8 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 stroke-1 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-medium">ยังไม่มีกิจกรรมที่บันทึกในวันนี้</p>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">
                    พิมพ์ช่องด้านบนเพื่อเพิ่มกิจกรรมหรือสิ่งที่ทำไปแล้ว
                  </p>
                </div>
              ) : (
                items.map((item) => {
                  const isDone = item.status === 'completed'
                  const catStyle = getCategoryStyle(item.category)

                  return (
                    <div
                      key={item.id}
                      className={`group flex items-center justify-between gap-3 rounded-2xl border p-3 ${
                        isDone
                          ? 'border-emerald-200/60 bg-emerald-50/30 dark:bg-emerald-950/20'
                          : 'border-border bg-card/60 hover:border-primary/40'
                      }`}
                    >
                      {/* Checkbox & Title */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleItem(item)}
                          disabled={isPending || editingItemId === item.id}
                          className="shrink-0 disabled:opacity-60"
                        >
                          {itemAction?.itemId === item.id && itemAction.action === 'complete' ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : isDone ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                          )}
                        </button>

                        {editingItemId === item.id ? (
                          <div className="min-w-0 flex-1 space-y-2">
                            <input
                              value={editTitle}
                              onChange={(event) => setEditTitle(event.target.value)}
                              disabled={isPending}
                              aria-label="ชื่อรายการ"
                              className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm"
                            />
                            <div className="flex flex-wrap gap-2">
                              <select
                                value={editCategory}
                                onChange={(event) => setEditCategory(event.target.value)}
                                disabled={isPending}
                                aria-label="หมวดหมู่"
                                className="rounded-lg border bg-background px-2 py-1 text-xs"
                              >
                                <option value="general">หมวดทั่วไป</option>
                                <option value="work">งาน (Work)</option>
                                <option value="study">เรียน (Study)</option>
                                <option value="exercise">ออกกำลังกาย</option>
                                <option value="personal">ส่วนตัว</option>
                              </select>
                              <select
                                value={editPriority}
                                onChange={(event) => setEditPriority(event.target.value as 'low' | 'medium' | 'high')}
                                disabled={isPending}
                                aria-label="ความสำคัญ"
                                className="rounded-lg border bg-background px-2 py-1 text-xs"
                              >
                                <option value="low">ความสำคัญ: ต่ำ</option>
                                <option value="medium">ความสำคัญ: ปานกลาง</option>
                                <option value="high">ความสำคัญ: สูง</option>
                              </select>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="time"
                                value={editStartTime}
                                onChange={(event) => setEditStartTime(event.target.value)}
                                disabled={isPending}
                                aria-label="เวลาเริ่ม"
                                className="rounded-lg border bg-background px-2 py-1 text-xs"
                              />
                              <span className="text-xs text-muted-foreground">ถึง</span>
                              <input
                                type="time"
                                value={editEndTime}
                                onChange={(event) => setEditEndTime(event.target.value)}
                                disabled={isPending}
                                aria-label="เวลาสิ้นสุด"
                                className="rounded-lg border bg-background px-2 py-1 text-xs"
                              />
                              <input
                                value={editTags}
                                onChange={(event) => setEditTags(event.target.value)}
                                disabled={isPending}
                                aria-label="แท็ก"
                                placeholder="แท็ก คั่นด้วยจุลภาค"
                                className="min-w-[120px] flex-1 rounded-lg border bg-background px-2 py-1 text-xs"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveItem(item)}
                                disabled={!editTitle.trim() || isPending}
                                className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                              >
                                {itemAction?.itemId === item.id && itemAction.action === 'edit' ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5" />
                                )}
                                บันทึก
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                disabled={isPending}
                                className="rounded-lg border px-2.5 py-1 text-xs font-semibold text-muted-foreground disabled:opacity-50"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="min-w-0 flex-1">
                            <span
                              className={`text-sm font-medium block truncate ${
                                isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                              }`}
                            >
                              {item.title}
                            </span>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${catStyle.dot}`} />
                                <span className="capitalize">{item.category}</span>
                              </span>

                              {item.priority === 'high' && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200">
                                  ด่วน
                                </span>
                              )}

                              {(item.start_time || item.end_time) && (
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {item.start_time?.slice(0, 5)} {item.end_time ? `- ${item.end_time.slice(0, 5)}` : ''}
                                </span>
                              )}

                              {item.tags?.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {editingItemId !== item.id && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            disabled={isPending}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-primary disabled:opacity-50"
                            title="แก้ไขรายการ"
                            aria-label={`แก้ไข ${item.title}`}
                          >
                            {itemAction?.itemId === item.id && itemAction.action === 'edit' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Pencil className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={isPending}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                            title="ลบรายการ"
                            aria-label={`ลบ ${item.title}`}
                          >
                            {itemAction?.itemId === item.id && itemAction.action === 'delete' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2.5 sm:px-6 sm:py-3 bg-muted/20">
          <span className="hidden sm:inline text-xs text-muted-foreground">
            กดปุ่ม <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px]">Esc</kbd> เพื่อปิด
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border bg-background px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-muted text-center"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
