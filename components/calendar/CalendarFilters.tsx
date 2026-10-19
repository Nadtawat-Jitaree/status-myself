"use client"

import React from 'react'
import { Filter, Search, X, CheckCircle2, CircleDashed, Tag } from 'lucide-react'

interface CalendarFiltersProps {
  category: string
  status: string
  selectedTag: string
  search: string
  availableCategories: string[]
  availableTags: string[]
  onCategoryChange: (cat: string) => void
  onStatusChange: (status: string) => void
  onTagChange: (tag: string) => void
  onSearchChange: (search: string) => void
  onReset: () => void
}

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  general: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-200', dot: 'bg-slate-400', border: 'border-slate-300' },
  work: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', border: 'border-blue-200 dark:border-blue-800' },
  study: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-800' },
  exercise: { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500', border: 'border-orange-200 dark:border-orange-800' },
  personal: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500', border: 'border-purple-200 dark:border-purple-800' },
}

export function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category.toLowerCase()] || CATEGORY_COLORS.general
}

export default function CalendarFilters({
  category,
  status,
  selectedTag,
  search,
  availableCategories,
  availableTags,
  onCategoryChange,
  onStatusChange,
  onTagChange,
  onSearchChange,
  onReset,
}: CalendarFiltersProps) {
  const isFiltered = category !== 'all' || status !== 'all' || selectedTag !== 'all' || search !== ''

  // Categories รวม default กับที่มีใน DB
  const defaultCategories = ['work', 'study', 'exercise', 'personal', 'general']
  const allCats = Array.from(new Set([...defaultCategories, ...availableCategories]))

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="ค้นหากิจกรรมหรือบันทึก..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border bg-background py-2 pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filters & Reset Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 rounded-xl border bg-muted/50 p-1 text-xs font-medium flex-1 sm:flex-initial justify-between sm:justify-start">
            <button
              onClick={() => onStatusChange('all')}
              className={`flex-1 sm:flex-initial text-center rounded-lg px-2.5 py-1.5 ${
                status === 'all'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => onStatusChange('completed')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 ${
                status === 'completed'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>ทำแล้ว</span>
            </button>
            <button
              onClick={() => onStatusChange('todo')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 ${
                status === 'todo'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CircleDashed className="h-3.5 w-3.5 shrink-0" />
              <span>รอทำ</span>
            </button>
          </div>

          {/* Reset Filter Button */}
          {isFiltered && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 rounded-xl border border-destructive/20 bg-destructive/10 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 shrink-0"
              title="ล้างตัวกรอง"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ล้างตัวกรอง</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills & Tag Chips - Horizontal scroll on mobile */}
      <div className="flex items-center gap-1.5 sm:gap-2 pt-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none sm:flex-wrap">
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground shrink-0">
          <Filter className="h-3.5 w-3.5" /> หมวดหมู่:
        </span>
        <button
          onClick={() => onCategoryChange('all')}
          className={`shrink-0 rounded-full px-2.5 sm:px-3 py-1 text-xs font-medium ${
            category === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/70 text-muted-foreground hover:bg-muted'
          }`}
        >
          ทั้งหมด
        </button>
        {allCats.map((cat) => {
          const style = getCategoryStyle(cat)
          const isSelected = category === cat
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(isSelected ? 'all' : cat)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full border px-2.5 sm:px-3 py-1 text-xs font-medium ${
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : `${style.bg} ${style.text} ${style.border} hover:opacity-80`
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-white' : style.dot}`} />
              <span className="capitalize">{cat}</span>
            </button>
          )
        })}

        {/* Tag Filters (ถ้ามี) */}
        {availableTags.length > 0 && (
          <div className="shrink-0 flex items-center gap-1.5 pl-2 border-l border-border">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={selectedTag}
              onChange={(e) => onTagChange(e.target.value)}
              className="rounded-lg border bg-background px-2 py-1 text-xs font-medium focus:outline-none"
            >
              <option value="all">แท็กทั้งหมด</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
