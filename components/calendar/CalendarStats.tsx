"use client"

import React from 'react'
import { CheckCircle2, TrendingUp, Calendar as CalendarIcon, Flame } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { LogItem, DailyLog } from '@/app/actions/calendar'

interface CalendarStatsProps {
  logItems: Record<string, LogItem[]>
  dailyLogs: Record<string, DailyLog>
  year: number
  month: number
}

const PIE_COLORS: Record<string, string> = {
  general: '#94a3b8',
  work: '#3b82f6',
  study: '#10b981',
  exercise: '#f97316',
  personal: '#a855f7',
}

export default function CalendarStats({
  logItems,
  dailyLogs,
  year,
  month,
}: CalendarStatsProps) {
  // รวบรวมสถิติเฉพาะเดือนที่กำลังดู
  const currentMonthPrefix = `${year}-${String(month).padStart(2, '0')}`

  const allMonthItems: LogItem[] = []
  Object.entries(logItems).forEach(([date, items]) => {
    if (date.startsWith(currentMonthPrefix)) {
      allMonthItems.push(...items)
    }
  })

  const totalTasks = allMonthItems.length
  const completedTasks = allMonthItems.filter((i) => i.status === 'completed').length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // นับวันที่มีกิจกรรมหรือมี daily log
  const activeDaysSet = new Set<string>()
  Object.entries(logItems).forEach(([date, items]) => {
    if (date.startsWith(currentMonthPrefix) && items.length > 0) activeDaysSet.add(date)
  })
  Object.entries(dailyLogs).forEach(([date, log]) => {
    if (date.startsWith(currentMonthPrefix) && (log.summary || log.mood)) activeDaysSet.add(date)
  })
  const activeDaysCount = activeDaysSet.size

  // คำนวณ Category Distribution
  const categoryCountMap: Record<string, number> = {}
  allMonthItems.forEach((item) => {
    const cat = item.category || 'general'
    categoryCountMap[cat] = (categoryCountMap[cat] || 0) + 1
  })

  const chartData = Object.entries(categoryCountMap).map(([name, value]) => ({
    name,
    value,
    color: PIE_COLORS[name.toLowerCase()] || '#64748b',
  }))

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {/* Card 1: Completed Rate */}
      <div className="rounded-2xl border bg-card p-3 sm:p-4 shadow-sm flex items-center justify-between">
        <div className="min-w-0 flex-1 pr-1.5">
          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            ความคืบหน้ารวม
          </p>
          <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mt-1">
            <span className="text-lg sm:text-2xl font-black text-foreground">{completionRate}%</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
              ({completedTasks}/{totalTasks})
            </span>
          </div>
          <div className="w-full max-w-[110px] h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0">
          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>

      {/* Card 2: Active Days */}
      <div className="rounded-2xl border bg-card p-3 sm:p-4 shadow-sm flex items-center justify-between">
        <div className="min-w-0 flex-1 pr-1.5">
          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            วันที่บันทึก
          </p>
          <div className="flex items-baseline gap-1 sm:gap-2 mt-1">
            <span className="text-lg sm:text-2xl font-black text-foreground">{activeDaysCount}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">วันในเดือนนี้</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 mt-1 truncate">มีกิจกรรม/โน้ต</p>
        </div>
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0">
          <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>

      {/* Card 3: Total Logs / Tasks */}
      <div className="rounded-2xl border bg-card p-3 sm:p-4 shadow-sm flex items-center justify-between">
        <div className="min-w-0 flex-1 pr-1.5">
          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            ภารกิจทั้งหมด
          </p>
          <div className="flex items-baseline gap-1 sm:gap-2 mt-1">
            <span className="text-lg sm:text-2xl font-black text-foreground">{totalTasks}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">รายการ</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 mt-1 truncate">
            {totalTasks - completedTasks} งานรอทำ
          </p>
        </div>
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>

      {/* Card 4: Category Distribution Mini Chart */}
      <div className="rounded-2xl border bg-card p-3 sm:p-4 shadow-sm flex items-center justify-between">
        <div className="flex-1 min-w-0 pr-1 sm:pr-2">
          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            สัดส่วนหมวด
          </p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {chartData.slice(0, 3).map((c) => (
              <span key={c.name} className="flex items-center gap-1 text-[9px] sm:text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="capitalize truncate max-w-[50px] sm:max-w-none">{c.name}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="h-11 w-11 sm:h-14 sm:w-14 shrink-0">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={13}
                  outerRadius={24}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} รายการ`, name]}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-full border border-dashed flex items-center justify-center text-[10px] text-muted-foreground">
              -
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
