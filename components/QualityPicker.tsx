"use client";

import React from "react";
import { Quality, SelectedQualityInput } from "@/app/actions/qualities";
import { QualityIconRenderer } from "@/lib/lucide-icons";
import { Sparkles } from "lucide-react";

interface QualityPickerProps {
  qualities: Quality[];
  value: SelectedQualityInput[];
  onChange: (val: SelectedQualityInput[]) => void;
  label?: string;
  sublabel?: string;
}

export function QualityPicker({
  qualities,
  value,
  onChange,
  label = "คุณสมบัติที่ได้รับ",
  sublabel = "ติ๊กเพื่อรับแต้มเมื่อทำสำเร็จ",
}: QualityPickerProps) {
  if (!qualities || qualities.length === 0) {
    return null;
  }

  const isChecked = (qualityId: string) =>
    value.some((item) => item.quality_id === qualityId);

  const getLevel = (qualityId: string): 1 | 3 | 5 => {
    const item = value.find((q) => q.quality_id === qualityId);
    return item ? item.level : 1;
  };

  const toggleQuality = (qualityId: string) => {
    if (isChecked(qualityId)) {
      onChange(value.filter((item) => item.quality_id !== qualityId));
    } else {
      onChange([...value, { quality_id: qualityId, level: 1 }]);
    }
  };

  const changeLevel = (qualityId: string, level: 1 | 3 | 5) => {
    if (!isChecked(qualityId)) {
      onChange([...value, { quality_id: qualityId, level }]);
    } else {
      onChange(
        value.map((item) =>
          item.quality_id === qualityId ? { ...item, level } : item
        )
      );
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {label}
        </label>
        <span className="text-[11px] text-muted-foreground">
          {sublabel}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {qualities.map((q) => {
          const checked = isChecked(q.id);
          const currentLevel = getLevel(q.id);

          return (
            <div
              key={q.id}
              className={`p-2.5 rounded-xl border transition-colors flex flex-col gap-2 ${
                checked
                  ? "bg-accent/40 border-primary/50 text-foreground"
                  : "bg-background border-border text-foreground hover:bg-muted/40"
              }`}
            >
              {/* Checkbox Header */}
              <div
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => toggleQuality(q.id)}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleQuality(q.id)}
                  className="w-4 h-4 rounded text-primary focus:ring-ring border-input cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: q.color || "#2563eb" }}
                >
                  <QualityIconRenderer iconName={q.icon} className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium truncate block">
                    {q.name}
                  </span>
                </div>
              </div>

              {/* Level Selector Options (แสดงเมื่อติ๊กเลือก) */}
              {checked && (
                <div className="flex items-center gap-1 pt-1 border-t border-border/60 justify-between">
                  <span className="text-[10px] text-muted-foreground">ระดับ:</span>
                  <div className="inline-flex rounded-lg p-0.5 bg-muted/70 border border-border">
                    {([
                      { lvl: 1, label: "+1 ปกติ" },
                      { lvl: 3, label: "+3 กลาง" },
                      { lvl: 5, label: "+5 มาก" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.lvl}
                        type="button"
                        onClick={() => changeLevel(q.id, opt.lvl)}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${
                          currentLevel === opt.lvl
                            ? "bg-background text-foreground font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
