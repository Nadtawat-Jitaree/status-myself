"use client";

import React, { useState, useMemo } from "react";
import { AVAILABLE_ICONS, QualityIconRenderer } from "@/lib/lucide-icons";
import { Search, X, Tag } from "lucide-react";

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (iconName: string) => void;
  selectedIcon?: string;
}

export function IconPickerModal({
  isOpen,
  onClose,
  onSelectIcon,
  selectedIcon,
}: IconPickerModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ทั้งหมด");

  // ดึงหมวดหมู่ทั้งหมด
  const categories = useMemo(() => {
    const cats = new Set<string>();
    AVAILABLE_ICONS.forEach((i) => {
      if (i.category) cats.add(i.category);
    });
    return ["ทั้งหมด", ...Array.from(cats)];
  }, []);

  const filteredIcons = useMemo(() => {
    let list = AVAILABLE_ICONS;

    if (selectedCategory !== "ทั้งหมด") {
      list = list.filter((item) => item.category === selectedCategory);
    }

    if (!searchTerm.trim()) return list;

    const term = searchTerm.toLowerCase();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.label.toLowerCase().includes(term) ||
        (item.category && item.category.toLowerCase().includes(term))
    );
  }, [searchTerm, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60">
      <div className="bg-card text-card-foreground rounded-2xl shadow-lg border border-border w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              เลือกไอคอนคุณสมบัติ
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              มีให้เลือกมากกว่า {AVAILABLE_ICONS.length} ไอคอน พร้อมหมวดหมู่และช่องค้นหา
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-3 sm:p-4 border-b border-border bg-muted/30 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาไอคอน (เช่น dumbbell, book, วิ่ง, ทำงาน, โค้ด, นอน, กาแฟ)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-0.5 mr-1" />
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors font-medium ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid List */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 grid grid-cols-4 sm:grid-cols-6 gap-2">
          {filteredIcons.map((item) => {
            const isSelected = selectedIcon === item.name;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  onSelectIcon(item.name);
                  onClose();
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border hover:border-border hover:bg-muted/50 text-foreground"
                }`}
                title={`${item.name} - ${item.label}`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1">
                  <QualityIconRenderer iconName={item.name} className="w-5 h-5" />
                </div>
                <span className="text-[11px] truncate w-full text-muted-foreground">
                  {item.name}
                </span>
              </button>
            );
          })}

          {filteredIcons.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
              ไม่พบไอคอนที่ตรงกับคำค้นหา &quot;{searchTerm}&quot;
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-muted/20 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>แสดง {filteredIcons.length} จาก {AVAILABLE_ICONS.length} ไอคอน</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
