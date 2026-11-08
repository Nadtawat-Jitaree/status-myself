"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Quality } from "@/app/actions/qualities";
import { QualityIconRenderer } from "@/lib/lucide-icons";
import { IconPickerModal } from "./IconPickerModal";
import { X, Sparkles, Pipette } from "lucide-react";

interface QualityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    icon: string;
    color: string;
    description: string;
  }) => Promise<void>;
  initialData?: Quality | null;
  loading?: boolean;
}

const PRESET_COLORS = [
  "#2563eb", // Blue
  "#0284c7", // Sky
  "#0d9488", // Teal
  "#16a34a", // Green
  "#84cc16", // Lime
  "#ca8a04", // Yellow
  "#ea580c", // Orange
  "#dc2626", // Red
  "#e11d48", // Rose
  "#db2777", // Pink
  "#9333ea", // Purple
  "#4f46e5", // Indigo
  "#475569", // Slate
  "#18181b", // Zinc / Black
];

export function QualityFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: QualityFormModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Star");
  const [color, setColor] = useState("#2563eb");
  const [description, setDescription] = useState("");
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setIcon(initialData.icon || "Star");
      setColor(initialData.color || "#2563eb");
      setDescription(initialData.description || "");
    } else {
      setName("");
      setIcon("Star");
      setColor("#2563eb");
      setDescription("");
    }
    setError("");
  }, [initialData, isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("กรุณากรอกชื่อคุณสมบัติ");
      return;
    }
    setError("");
    await onSubmit({
      name,
      icon,
      color,
      description,
    });
  };

  return createPortal(
    <>
      <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[100] m-0 flex items-center justify-center p-4 bg-black/70">
        <div className="bg-card text-card-foreground rounded-2xl shadow-lg border border-border w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                {initialData ? "แก้ไขคุณสมบัติ" : "สร้างคุณสมบัติใหม่"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            {error && (
              <div className="p-3 text-xs rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            {/* เลือก Icon + Preview */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                ไอคอน & สีประจำตัว
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsIconPickerOpen(true)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-dashed border-border hover:border-primary bg-muted/30 transition-colors"
                  title="คลิกเพื่อเปลี่ยนไอคอน"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: color }}
                  >
                    <QualityIconRenderer iconName={icon} className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-medium block text-foreground truncate max-w-[90px]">
                      {icon}
                    </span>
                    <span className="text-[11px] text-muted-foreground">คลิกเปลี่ยน</span>
                  </div>
                </button>

                {/* Color Palette + Custom Color Picker */}
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-5 h-5 rounded-full border border-black/10 transition-transform ${
                          color.toLowerCase() === c.toLowerCase()
                            ? "ring-2 ring-offset-1 ring-primary scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}

                    {/* Native Color Picker Icon Button */}
                    <label
                      className="relative w-5 h-5 rounded-full border border-dashed border-border hover:border-primary flex items-center justify-center cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
                      title="เลือกสีเองอย่างอิสระ (Color Picker)"
                    >
                      <Pipette className="w-3 h-3 text-muted-foreground" />
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Input Hex แสดงรหัสสีและแก้ไขได้โดยตรง */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div
                      className="w-3.5 h-3.5 rounded-md border border-border shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="#2563eb"
                      maxLength={7}
                      className="text-[11px] font-mono px-1.5 py-0.5 rounded border border-input bg-background text-muted-foreground focus:text-foreground w-20 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-[10px] text-muted-foreground">รหัสสี Hex</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ชื่อทักษะ */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                ชื่อทักษะ <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น ออกกำลังกาย, การอ่านหนังสือ, การตรงต่อเวลา"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>

            {/* คำอธิบาย */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                คำอธิบาย / เป้าหมาย (ถ้ามี)
              </label>
              <textarea
                placeholder="เช่น ออกกำลังกายอย่างน้อย 30 นาที หรือ อ่าน 10 หน้าต่อวัน"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "กำลังบันทึก..." : initialData ? "บันทึกการแก้ไข" : "สร้างคุณสมบัติ"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <IconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSelectIcon={(selected) => setIcon(selected)}
        selectedIcon={icon}
      />
    </>,
    document.body
  );
}
