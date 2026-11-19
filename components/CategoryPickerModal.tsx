"use client";

import React, { useState, useMemo } from "react";
import { Folder, Search, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { NoteCategoryItem } from "./NoteFormModal";

interface CategoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: NoteCategoryItem[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  noteType?: string;
  title?: string;
  subtitle?: string;
  zIndexClass?: string;
}

export function CategoryPickerModal({
  isOpen,
  onClose,
  categories,
  selectedCategoryId,
  onSelectCategory,
  noteType = "normal",
  title = "เลือกหมวดหมู่สำหรับบันทึกนี้",
  subtitle = "เลือกหมวดหมู่ที่ตรงกับหัวข้อของคุณ",
  zIndexClass = "z-[120]",
}: CategoryPickerModalProps) {
  const [categorySearch, setCategorySearch] = useState("");
  const [modalSelectYear, setModalSelectYear] = useState<number | "all" | "none">("all");
  const [modalSelectSemester, setModalSelectSemester] = useState<number | "all" | "none">("all");

  const getPicUrl = (picPath?: string | null) => {
    if (!picPath) return "";
    try {
      return createClient().storage.from("logo").getPublicUrl(picPath).data.publicUrl;
    } catch {
      return "";
    }
  };

  const formatSemester = (sem?: number | null) => {
    if (sem === 1) return "เทอม 1";
    if (sem === 2) return "เทอม 2";
    if (sem === 3) return "ฤดูร้อน";
    return "";
  };

  const formatYearSemester = (year?: number | null, sem?: number | null) => {
    const yStr = year ? `ปี ${year}` : "";
    const sStr = formatSemester(sem);
    if (yStr && sStr) return `${yStr} · ${sStr}`;
    if (yStr) return yStr;
    return sStr;
  };

  const hasUnassignedYearCats = categories.some((c) => !c.year);
  const hasUnassignedSemesterCats = categories.some((c) => !c.semester);

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      if (noteType === "school") {
        if (modalSelectYear !== "all") {
          if (modalSelectYear === "none") {
            if (cat.year) return false;
          } else if (cat.year !== modalSelectYear) {
            return false;
          }
        }
        if (modalSelectSemester !== "all") {
          if (modalSelectSemester === "none") {
            if (cat.semester) return false;
          } else if (cat.semester !== modalSelectSemester) {
            return false;
          }
        }
      }

      if (categorySearch.trim()) {
        const query = categorySearch.toLowerCase().trim();
        return cat.name.toLowerCase().includes(query);
      }

      return true;
    });
  }, [categories, noteType, modalSelectYear, modalSelectSemester, categorySearch]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150 select-none`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card text-card-foreground rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4 pt-2 sm:p-5 md:p-6 border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Folder className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-foreground leading-tight">
                  {title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {subtitle}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md shrink-0 cursor-pointer mt-1"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="ค้นหาหมวดหมู่..."
              className="w-full h-10 pl-9 pr-9 rounded-xl border border-input bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition"
              autoFocus
            />
            {categorySearch && (
              <button
                type="button"
                onClick={() => setCategorySearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Year & Semester Filter Tabs */}
        {noteType === "school" && (
          <div className="flex flex-col gap-2 px-5 pt-3 pb-2.5 border-b border-border bg-muted/5">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
              <span className="text-[11px] font-bold text-muted-foreground mr-1 shrink-0 uppercase tracking-wide">
                ชั้นปี:
              </span>
              {[
                { id: "all" as const, label: "ทุกชั้นปี" },
                { id: 1 as const, label: "ปี 1" },
                { id: 2 as const, label: "ปี 2" },
                { id: 3 as const, label: "ปี 3" },
                { id: 4 as const, label: "ปี 4" },
                ...(hasUnassignedYearCats
                  ? [{ id: "none" as const, label: "ไม่ระบุ" }]
                  : []),
              ].map((yTab) => (
                <button
                  key={String(yTab.id)}
                  type="button"
                  onClick={() => setModalSelectYear(yTab.id)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold border shrink-0 transition-all cursor-pointer ${
                    modalSelectYear === yTab.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:bg-muted/60"
                  }`}
                >
                  {yTab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pt-1.5 border-t border-border/40 pb-0.5">
              <span className="text-[11px] font-bold text-muted-foreground mr-1 shrink-0 uppercase tracking-wide">
                เทอม:
              </span>
              {[
                { id: "all" as const, label: "ทุกเทอม" },
                { id: 1 as const, label: "เทอม 1" },
                { id: 2 as const, label: "เทอม 2" },
                { id: 3 as const, label: "ฤดูร้อน" },
                ...(hasUnassignedSemesterCats
                  ? [{ id: "none" as const, label: "ไม่ระบุ" }]
                  : []),
              ].map((sTab) => (
                <button
                  key={String(sTab.id)}
                  type="button"
                  onClick={() => setModalSelectSemester(sTab.id)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold border shrink-0 transition-all cursor-pointer ${
                    modalSelectSemester === sTab.id
                      ? "bg-indigo-500 text-white border-indigo-500 shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:bg-muted/60"
                  }`}
                >
                  {sTab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category Grid */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 md:p-6">
          {filteredCategories.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Folder className="w-7 h-7 opacity-40" />
              </div>
              <p className="text-sm font-medium">ไม่พบหมวดหมู่ที่ตรงกับเงื่อนไข</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      onClose();
                    }}
                    className={`group relative flex flex-col items-center gap-2.5 p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm"
                    }`}
                  >
                    {/* Selected badge */}
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}

                    {/* Icon / Image */}
                    {cat.pic ? (
                      <img
                        src={getPicUrl(cat.pic)}
                        className={`rounded-2xl object-cover shadow-sm transition-transform group-hover:scale-105 ${
                          isSelected ? "w-14 h-14" : "w-12 h-12"
                        }`}
                        alt={cat.name}
                      />
                    ) : (
                      <div
                        className={`rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 ${
                          isSelected
                            ? "w-14 h-14 bg-primary/15 text-primary shadow-sm"
                            : "w-12 h-12 bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        }`}
                      >
                        <Folder className={isSelected ? "w-7 h-7" : "w-6 h-6"} />
                      </div>
                    )}

                    {/* Name */}
                    <p
                      className={`font-semibold text-xs leading-tight truncate w-full transition-colors ${
                        isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
                      }`}
                      title={cat.name}
                    >
                      {cat.name}
                    </p>

                    {/* Year/Semester badge for school */}
                    {noteType === "school" && (cat.year || cat.semester) && (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                          isSelected
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {formatYearSemester(cat.year, cat.semester)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/10 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {filteredCategories.length} หมวดหมู่
            {categorySearch && ` · ค้นหา "${categorySearch}"`}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 cursor-pointer text-xs"
            onClick={onClose}
          >
            ปิด
          </Button>
        </div>
      </div>
    </div>
  );
}
