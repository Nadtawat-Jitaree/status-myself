"use client"

import React, { useState, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  FileText,
  GraduationCap,
  Eye,
  Edit2,
  Trash2,
  Pin,
  Clock,
  ExternalLink,
  Save,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Download,
  Copy,
  Check
} from 'lucide-react'
import Swal from 'sweetalert2'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarNote,
  updateNote,
  deleteNote,
  getCategories,
  togglePinNote,
} from '@/app/actions/notes'
import NoteContentRenderer from '@/components/NoteContentRenderer'
import RichNoteEditor from '@/components/RichNoteEditor'

interface CalendarNoteModalProps {
  isOpen: boolean
  dateStr: string // YYYY-MM-DD
  initialType?: 'all' | 'normal' | 'school'
  notes: CalendarNote[]
  onClose: () => void
  onRefresh: () => void
}

const getStatusBadgeColor = (noteStatus: string) => {
  switch (noteStatus) {
    case 'สำคัญ':
      return 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800'
    case 'งานค้าง':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    case 'เสร็จสิ้น':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  }
}

export default function CalendarNoteModal({
  isOpen,
  dateStr,
  initialType = 'all',
  notes,
  onClose,
  onRefresh,
}: CalendarNoteModalProps) {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'normal' | 'school'>(initialType)
  const [isPending, startTransition] = useTransition()

  // State สำหรับดู Note (Reading Mode)
  const [viewingNote, setViewingNote] = useState<CalendarNote | null>(null)
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  // State สำหรับแก้ไข Note (Edit Mode)
  const [editingNote, setEditingNote] = useState<CalendarNote | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editStatus, setEditStatus] = useState('ทั่วไป')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [availableCategories, setAvailableCategories] = useState<any[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setActiveTab(initialType)
  }, [initialType, dateStr])

  // ดึง Attachment Signed URL เมื่อเปิดดู Note
  useEffect(() => {
    let isCancelled = false
    const fetchSignedUrl = async () => {
      if (viewingNote?.file_path) {
        try {
          const supabase = createClient()
          const { data } = await supabase.storage
            .from('note_attachments')
            .createSignedUrl(viewingNote.file_path, 3600)
          if (!isCancelled && data?.signedUrl) {
            setAttachmentUrl(data.signedUrl)
          }
        } catch {
          if (!isCancelled) setAttachmentUrl(null)
        }
      } else {
        setAttachmentUrl(null)
      }
    }
    fetchSignedUrl()
    return () => {
      isCancelled = true
    }
  }, [viewingNote])

  // โหลดหมวดหมู่เมื่อเข้าสู่โหมดแก้ไข
  useEffect(() => {
    if (editingNote) {
      setEditTitle(editingNote.title)
      setEditContent(editingNote.content || '')
      setEditStatus(editingNote.status || 'ทั่วไป')
      setEditCategoryId(editingNote.category_id || '')

      const noteType = editingNote.note_categories?.note_type || 'normal'
      setLoadingCategories(true)
      getCategories(noteType)
        .then((cats) => {
          setAvailableCategories(cats || [])
        })
        .catch((err) => {
          console.error('Failed to load categories for note editing:', err)
        })
        .finally(() => {
          setLoadingCategories(false)
        })
    }
  }, [editingNote])

  if (!isOpen || !mounted) return null

  // Format วันที่ภาษาไทย
  const dateObj = new Date(dateStr + 'T00:00:00')
  const thaiDateFormatted = dateObj.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // กรองตามแท็บ
  const filteredNotes = notes.filter((n) => {
    if (activeTab === 'all') return true
    return (n.note_categories?.note_type || 'normal') === activeTab
  })

  const normalNotes = notes.filter((n) => (n.note_categories?.note_type || 'normal') === 'normal')
  const schoolNotes = notes.filter((n) => n.note_categories?.note_type === 'school')

  // Handle ลบ Note
  const handleDeleteNote = async (note: CalendarNote) => {
    const result = await Swal.fire({
      title: 'ลบบันทึกนี้?',
      text: `คุณแน่ใจหรือไม่ว่าต้องการลบ "${note.title}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
    })

    if (result.isConfirmed) {
      startTransition(async () => {
        try {
          await deleteNote(note.id)
          await Swal.fire({
            icon: 'success',
            title: 'ลบเรียบร้อย',
            timer: 1200,
            showConfirmButton: false,
          })
          if (viewingNote?.id === note.id) {
            setViewingNote(null)
          }
          if (editingNote?.id === note.id) {
            setEditingNote(null)
          }
          onRefresh()
        } catch (err: any) {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: err?.message || 'ไม่สามารถลบโน้ตได้',
          })
        }
      })
    }
  }

  // Handle ปักหมุด
  const handleTogglePin = (note: CalendarNote) => {
    const nextPinned = !note.is_pinned
    startTransition(async () => {
      try {
        await togglePinNote(note.id, nextPinned)
        onRefresh()
      } catch (err) {
        console.error('Failed to toggle pin', err)
      }
    })
  }

  // Handle คัดลอกข้อความ
  const handleCopyContent = (text: string) => {
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  // Handle บันทึกการแก้ไข
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingNote || !editTitle.trim()) return

    startTransition(async () => {
      try {
        const cleanedContent = (editContent || '')
          .replace(/<span[^>]*>\s*<\/span>/gi, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim()

        await updateNote(editingNote.id, {
          title: editTitle.trim(),
          content: cleanedContent,
          category_id: editCategoryId || null,
          status: editStatus,
          file_path: editingNote.file_path,
          is_pinned: editingNote.is_pinned,
        })

        await Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ',
          timer: 1200,
          showConfirmButton: false,
        })

        // อัปเดต viewingNote หากกำลังดูอยู่
        if (viewingNote?.id === editingNote.id) {
          setViewingNote({
            ...viewingNote,
            title: editTitle.trim(),
            content: cleanedContent,
            category_id: editCategoryId || null,
            status: editStatus,
          })
        }

        setEditingNote(null)
        onRefresh()
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: err?.message || 'ไม่สามารถอัปเดตบันทึกได้',
        })
      }
    })
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col max-h-[92vh] w-full max-w-2xl rounded-3xl border bg-card shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            {viewingNote || editingNote ? (
              <button
                onClick={() => {
                  if (editingNote && viewingNote) {
                    setEditingNote(null)
                  } else {
                    setViewingNote(null)
                    setEditingNote(null)
                  }
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                title="ย้อนกลับ"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {editingNote
                    ? 'แก้ไขบันทึก'
                    : viewingNote
                    ? 'รายละเอียดบันทึก'
                    : 'รายการบันทึกประจำวัน'}
                </span>
                <span className="text-[11px] sm:text-xs text-muted-foreground">{dateStr}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground mt-0.5 truncate max-w-[280px] sm:max-w-md">
                {editingNote
                  ? editingNote.title
                  : viewingNote
                  ? viewingNote.title
                  : thaiDateFormatted}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 sm:p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1. EDIT MODE */}
        {editingNote ? (
          <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                หัวข้อบันทึก <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="ระบุหัวข้อบันทึก..."
                required
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  หมวดหมู่
                </label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  disabled={loadingCategories}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- ไม่ระบุหมวดหมู่ --</option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.year ? `(ปี ${c.year})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  สถานะ
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="ทั่วไป">ทั่วไป</option>
                  <option value="สำคัญ">สำคัญ</option>
                  <option value="งานค้าง">งานค้าง</option>
                  <option value="เสร็จสิ้น">เสร็จสิ้น</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                เนื้อหาบันทึก
              </label>
              <RichNoteEditor
                value={editContent}
                onChange={setEditContent}
                placeholder="พิมพ์เนื้อหา, ใส่รายการสิ่งที่ต้องทำ [ ], จัดรูปแบบ..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingNote(null)}
                className="rounded-xl border bg-background px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isPending || !editTitle.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                บันทึกการแก้ไข
              </button>
            </div>
          </form>
        ) : viewingNote ? (
          /* 2. VIEWING / READING MODE */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Top Info Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeColor(
                    viewingNote.status
                  )}`}
                >
                  {viewingNote.status || 'ทั่วไป'}
                </span>

                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-muted/60 text-muted-foreground border-border/60">
                  {viewingNote.note_categories?.note_type === 'school' ? (
                    <>
                      <GraduationCap className="h-3 w-3 text-purple-500" />
                      <span>เรียน: {viewingNote.note_categories?.name || 'ไม่มีหมวด'}</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-3 w-3 text-blue-500" />
                      <span>ทั่วไป: {viewingNote.note_categories?.name || 'ไม่มีหมวด'}</span>
                    </>
                  )}
                </span>

                {viewingNote.is_pinned && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                    <Pin className="h-2.5 w-2.5 fill-current" /> ปักหมุด
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCopyContent(viewingNote.content || viewingNote.title)}
                  className="flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  title="คัดลอกข้อความ"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>คัดลอก</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setEditingNote(viewingNote)}
                  className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>แก้ไข</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteNote(viewingNote)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  title="ลบบันทึก"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Note Title */}
            <div>
              <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                {viewingNote.title}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  สร้างเมื่อ{' '}
                  {new Date(viewingNote.created_at).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  น.
                </span>
              </div>
            </div>

            {/* Note Content Body */}
            <div className="rounded-2xl border bg-muted/20 p-4 min-h-[160px]">
              <NoteContentRenderer content={viewingNote.content} readOnly={true} />
            </div>

            {/* Attachment File Box (ถ้ามี) */}
            {viewingNote.file_path && attachmentUrl && (
              <div className="flex items-center justify-between rounded-xl border bg-card p-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Download className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold block truncate text-foreground">
                      {viewingNote.file_path.split('/').pop()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">ไฟล์แนบประกอบบันทึก</span>
                  </div>
                </div>

                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border bg-background px-3 py-1 text-xs font-semibold text-primary hover:bg-muted shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>เปิดดูไฟล์</span>
                </a>
              </div>
            )}
          </div>
        ) : (
          /* 3. LIST OF NOTES (Default) */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Tab Filter Bar */}
            <div className="flex items-center justify-between gap-2 border-b pb-3">
              <div className="flex items-center rounded-xl border bg-muted/40 p-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                    activeTab === 'all'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>ทั้งหมด</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px]">
                    {notes.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('normal')}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                    activeTab === 'normal'
                      ? 'bg-blue-500 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileText className="h-3 w-3" />
                  <span>ทั่วไป</span>
                  <span className="rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.2 text-[10px]">
                    {normalNotes.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('school')}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                    activeTab === 'school'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <GraduationCap className="h-3 w-3" />
                  <span>เรียน</span>
                  <span className="rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.2 text-[10px]">
                    {schoolNotes.length}
                  </span>
                </button>
              </div>

              {/* ลิงก์ลัดไปหน้า Note */}
              <a
                href={activeTab === 'school' ? '/system/notes/school' : '/system/notes/normal'}
                className="hidden sm:flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>ไปหน้าจัดการ Note</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* List */}
            {filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center text-muted-foreground">
                <AlertCircle className="h-9 w-9 stroke-1 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold">ไม่มีบันทึกในหมวดนี้สำหรับวันนี้</p>
                <p className="text-xs text-muted-foreground/80 mt-1 max-w-xs">
                  {notes.length > 0
                    ? 'ลองเปลี่ยนแท็บตัวกรองด้านบนเพื่อดูประเภทอื่น'
                    : 'คุณสามารถสร้างโน้ตใหม่ได้ที่หน้า Note บันทึกข้อมูล'}
                </p>
                <div className="mt-4 flex gap-2">
                  <a
                    href="/system/notes/normal"
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
                  >
                    + สร้าง Note ทั่วไป
                  </a>
                  <a
                    href="/system/notes/school"
                    className="inline-flex items-center gap-1 rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    + สร้าง Note เรียน
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredNotes.map((note) => {
                  const isSchool = note.note_categories?.note_type === 'school'
                  const previewText = (note.content || '').replace(/<[^>]+>/g, '').trim()

                  return (
                    <div
                      key={note.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border bg-card/80 p-3 sm:p-4 shadow-xs hover:border-primary/40 hover:shadow-sm transition-colors"
                    >
                      {/* Left: Icon & Title & Meta */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                            isSchool
                              ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                              : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          {isSchool ? (
                            <GraduationCap className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              onClick={() => setViewingNote(note)}
                              className="text-sm font-bold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                            >
                              {note.title}
                            </span>
                            {note.is_pinned && (
                              <Pin className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" />
                            )}
                          </div>

                          {previewText && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {previewText}
                            </p>
                          )}

                          {/* Meta Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeColor(
                                note.status
                              )}`}
                            >
                              {note.status || 'ทั่วไป'}
                            </span>

                            {note.note_categories?.name && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                                {note.note_categories.name}
                              </span>
                            )}

                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(note.created_at).toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center justify-end gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <button
                          type="button"
                          onClick={() => handleTogglePin(note)}
                          className={`rounded-lg p-1.5 transition-colors ${
                            note.is_pinned
                              ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                          title={note.is_pinned ? 'ยกเลิกการปักหมุด' : 'ปักหมุด'}
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewingNote(note)}
                          className="flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="h-3.5 w-3.5 text-primary" />
                          <span className="hidden sm:inline">ดู</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingNote(note)}
                          className="flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                          title="แก้ไขบันทึก"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="hidden sm:inline">แก้</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                          title="ลบบันทึก"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

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
