"use client"

import React, { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Smile,
  Target,
  Coffee,
  BatteryLow,
  Flame,
  FileText,
  CheckCircle2,
  Circle,
  Plus,
  Loader2
} from 'lucide-react'
import CalendarFilters, { getCategoryStyle } from './CalendarFilters'
import DayDetailModal from './DayDetailModal'
import CalendarStats from './CalendarStats'
import {
  DailyLog,
  LogItem,
  getCalendarMonthData,
  CalendarMonthResponse,
} from '@/app/actions/calendar'

const MOOD_ICONS: Record<string, { icon: any; color: string }> = {
  happy: { icon: Smile, color: 'text-amber-500' },
  productive: { icon: Target, color: 'text-emerald-500' },
  relaxed: { icon: Coffee, color: 'text-blue-500' },
  tired: { icon: BatteryLow, color: 'text-indigo-500' },
  focused: { icon: Flame, color: 'text-red-500' },
}

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

const DAY_NAMES = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

export default function CalendarClient() {
  const [mounted, setMounted] = useState(false)
  const [todayStr, setTodayStr] = useState('')
  const [currentYear, setCurrentYear] = useState(2026)
  const [currentMonth, setCurrentMonth] = useState(10) // 1-12

  useEffect(() => {
    const today = new Date()
    const str = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    setTodayStr(str)
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth() + 1)
    setMounted(true)
  }, [])

  // Filter States
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [selectedTag, setSelectedTag] = useState('all')
  const [search, setSearch] = useState('')

  // Data States
  const [loading, setLoading] = useState(true)
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({})
  const [logItems, setLogItems] = useState<Record<string, LogItem[]>>({})
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  // Modal State
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Fetch month data
  const loadMonthData = useCallback(async () => {
    if (!mounted) return
    try {
      setLoading(true)
      const data: CalendarMonthResponse = await getCalendarMonthData(currentYear, currentMonth, {
        category,
        status,
        tag: selectedTag,
        search,
      })
      setDailyLogs(data.dailyLogs)
      setLogItems(data.logItems)
      setAvailableCategories(data.allCategories)
      setAvailableTags(data.allTags)
    } catch (err) {
      console.error('Failed to load calendar data', err)
    } finally {
      setLoading(false)
    }
  }, [mounted, currentYear, currentMonth, category, status, selectedTag, search])

  useEffect(() => {
    if (mounted) {
      loadMonthData()
    }
  }, [mounted, loadMonthData])

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const handleGoToday = () => {
    const now = new Date()
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth() + 1)
  }

  const handleResetFilters = () => {
    setCategory('all')
    setStatus('all')
    setSelectedTag('all')
    setSearch('')
  }

  // Open modal for a date
  const handleCellClick = (dateStr: string) => {
    setSelectedDate(dateStr)
    setIsModalOpen(true)
  }

  // Build Calendar Matrix (42 cells: 6 weeks x 7 days)
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate()

  const calendarDays = []

  // 1. Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
    calendarDays.push({
      dateStr,
      dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    })
  }

  // 2. Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    calendarDays.push({
      dateStr,
      dayNum: i,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    })
  }

  // 3. Next month leading days (fill up to 42 cells)
  const remainingCells = 42 - calendarDays.length
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear
    const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    calendarDays.push({
      dateStr,
      dayNum: i,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    })
  }

  if (!mounted) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        <div className="h-14 w-64 bg-muted/60 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/50 rounded-2xl" />
          ))}
        </div>
        <div className="h-20 bg-muted/50 rounded-2xl" />
        <div className="h-[450px] bg-muted/40 rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Page Title & Month Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                ปฏิทิน & บันทึกรายวัน
              </h1>
              <p className="text-xs text-muted-foreground">
                บันทึกสิ่งที่ทำไปแล้ว สิ่งที่ต้องทำ และโน้ตสรุปประจำวัน
              </p>
            </div>
          </div>
        </div>

        {/* Month Selector Buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <button
            onClick={handleGoToday}
            className="rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shrink-0"
          >
            วันนี้
          </button>

          <div className="flex items-center rounded-xl border bg-card p-1 shadow-sm flex-1 sm:flex-initial justify-between sm:justify-start">
            <button
              onClick={handlePrevMonth}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="min-w-[120px] sm:min-w-[140px] text-center text-xs sm:text-sm font-bold text-foreground">
              {THAI_MONTH_NAMES[currentMonth - 1]} {currentYear}
            </span>

            <button
              onClick={handleNextMonth}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
              title="เดือนถัดไป"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary Widget */}
      <CalendarStats
        logItems={logItems}
        dailyLogs={dailyLogs}
        year={currentYear}
        month={currentMonth}
      />

      {/* Filter Toolbar */}
      <CalendarFilters
        category={category}
        status={status}
        selectedTag={selectedTag}
        search={search}
        availableCategories={availableCategories}
        availableTags={availableTags}
        onCategoryChange={setCategory}
        onStatusChange={setStatus}
        onTagChange={setSelectedTag}
        onSearchChange={setSearch}
        onReset={handleResetFilters}
      />

      {/* Calendar Grid Container */}
      <div
        className="relative rounded-2xl sm:rounded-3xl border bg-card p-2 sm:p-5 shadow-sm"
        aria-busy={loading}
      >
        {loading && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl sm:rounded-3xl bg-background/70 backdrop-blur-[2px]"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>กำลังโหลดข้อมูล...</span>
            </div>
          </div>
        )}
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 sm:mb-2">
          {DAY_NAMES.map((name, idx) => (
            <div
              key={name}
              className={`text-center py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
                idx === 0
                  ? 'text-red-500'
                  : idx === 6
                  ? 'text-blue-500'
                  : 'text-muted-foreground'
              }`}
            >
              {name}
            </div>
          ))}
        </div>

        {/* 42 Calendar Cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((cell) => {
            const dayItems = logItems[cell.dateStr] || []
            const dayLog = dailyLogs[cell.dateStr]
            const moodInfo = dayLog?.mood ? MOOD_ICONS[dayLog.mood] : null
            const hasNote = Boolean(dayLog?.summary && dayLog.summary.trim() !== '')

            const completedTasks = dayItems.filter((i) => i.status === 'completed').length
            const totalTasks = dayItems.length

            return (
              <div
                key={cell.dateStr}
                onClick={() => handleCellClick(cell.dateStr)}
                className={`group relative flex flex-col justify-between min-h-[68px] sm:min-h-[110px] md:min-h-[125px] rounded-xl sm:rounded-2xl border p-1 sm:p-2 md:p-2.5 cursor-pointer ${
                  cell.isCurrentMonth
                    ? 'bg-card hover:border-primary/50 hover:shadow-md'
                    : 'bg-muted/20 opacity-40 hover:opacity-80'
                } ${
                  cell.isToday
                    ? 'ring-2 ring-primary border-primary/50 bg-primary/[0.03]'
                    : 'border-border/60'
                }`}
              >
                {/* Top Row: Date Number & Badges */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span
                      className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-bold ${
                        cell.isToday
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : cell.isCurrentMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {/* Today label if screen is wide enough */}
                    {cell.isToday && (
                      <span className="hidden md:inline-block text-[9px] font-bold text-primary">
                        วันนี้
                      </span>
                    )}
                  </div>

                  {/* Mood & Note Indicators */}
                  <div className="flex items-center gap-1">
                    {moodInfo && (
                      <moodInfo.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${moodInfo.color}`} />
                    )}
                    {hasNote && (
                      <span
                        title="มีบันทึกสรุปประจำวัน"
                        className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-400 ring-2 ring-background"
                      />
                    )}
                  </div>
                </div>

                {/* Middle: Items preview */}
                {/* 1. Mobile Compact Dots (screens < 640px) */}
                <div className="sm:hidden flex flex-wrap items-center gap-1 my-1 px-0.5 min-h-[14px]">
                  {dayItems.slice(0, 3).map((item) => {
                    const isDone = item.status === 'completed'
                    const catStyle = getCategoryStyle(item.category)
                    return (
                      <span
                        key={item.id}
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          isDone ? 'bg-emerald-500' : catStyle.dot
                        }`}
                        title={item.title}
                      />
                    )
                  })}
                  {dayItems.length > 3 && (
                    <span className="text-[9px] font-bold text-muted-foreground/80 leading-none">
                      +{dayItems.length - 3}
                    </span>
                  )}
                </div>

                {/* 2. Desktop/Tablet Item Bars (screens >= 640px) */}
                <div className="hidden sm:block flex-1 my-1 space-y-1 overflow-hidden">
                  {dayItems.slice(0, 2).map((item) => {
                    const isDone = item.status === 'completed'
                    const catStyle = getCategoryStyle(item.category)
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] sm:text-[11px] truncate border ${
                          isDone
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/30 text-muted-foreground line-through border-emerald-200/40'
                            : `${catStyle.bg} ${catStyle.text} ${catStyle.border}`
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isDone ? 'bg-emerald-500' : catStyle.dot}`} />
                        <span className="truncate">{item.title}</span>
                      </div>
                    )
                  })}

                  {dayItems.length > 2 && (
                    <span className="block text-[10px] font-semibold text-muted-foreground/80 pl-1">
                      +{dayItems.length - 2} รายการ...
                    </span>
                  )}
                </div>

                {/* Bottom Row: Quick completion pill & Add hover */}
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-muted-foreground pt-0.5 sm:pt-1 border-t border-border/40">
                  {totalTasks > 0 ? (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="sm:hidden">{completedTasks}/{totalTasks}</span>
                      <span className="hidden sm:inline">{completedTasks}/{totalTasks} เสร็จ</span>
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground/50">
                      {hasNote ? <span className="text-amber-600 font-medium">โน้ต</span> : '-'}
                    </span>
                  )}

                  <span className="hidden sm:inline-block opacity-0 group-hover:opacity-100 text-primary p-0.5 rounded hover:bg-primary/10">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDate && (
        <DayDetailModal
          isOpen={isModalOpen}
          dateStr={selectedDate}
          dailyLog={dailyLogs[selectedDate] || null}
          items={logItems[selectedDate] || []}
          onClose={() => setIsModalOpen(false)}
          onRefresh={loadMonthData}
        />
      )}
    </div>
  )
}
