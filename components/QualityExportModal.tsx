"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Quality, QualityTransaction } from "@/app/actions/qualities";
import { QualityIconRenderer } from "@/lib/lucide-icons";
import {
  getLevelInfo,
  getLevelProgress,
  getPointsToNextLevel,
} from "@/lib/quality-levels";
import { toPng } from "html-to-image";
import {
  X,
  Download,
  Check,
  Sparkles,
  Smartphone,
  Monitor,
  Trophy,
  Zap,
  Radio,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";

interface QualityExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  qualities: Quality[];
  transactions: QualityTransaction[];
}

export function QualityExportModal({
  isOpen,
  onClose,
  qualities,
  transactions,
}: QualityExportModalProps) {
  // สัดส่วน: 16:9 แนวนอน หรือ 9:16 แนวตั้ง
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  // รายการ id ของทักษะที่ถูกเลือกแสดง
  const [selectedIds, setSelectedIds] = useState<string[]>(
    qualities.map((q) => q.id)
  );
  const [title, setTitle] = useState("MY SKILL MATRIX // STATUS TELEMETRY");
  const [isExporting, setIsExporting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  // กรองคุณสมบัติที่ถูกเลือก
  const displayedQualities = qualities.filter((q) => selectedIds.includes(q.id));
  const totalPoints = displayedQualities.reduce((acc, q) => acc + (q.points || 0), 0);

  // สถิติจำนวนครั้งของแต่ละสกิล
  const countMap = new Map<string, number>();
  transactions.forEach((tx) => {
    countMap.set(tx.quality_id, (countMap.get(tx.quality_id) || 0) + 1);
  });

  const toggleQuality = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length === 1) {
        Swal.fire({
          icon: "info",
          title: "ต้องเลือกอย่างน้อย 1 คุณสมบัติ",
          timer: 1500,
          showConfirmButton: false,
        });
        return;
      }
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => setSelectedIds(qualities.map((q) => q.id));

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      // หน่วงเวลาเล็กน้อยเพื่อให้ SVG font เรนเดอร์ครบ
      await new Promise((resolve) => setTimeout(resolve, 200));

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5, // ความละเอียดสูง คมชัดเป็นพิเศษ
        backgroundColor: "#09090b", // พื้นหลัง Dark Theme พรีเมียม
      });

      const link = document.createElement("a");
      link.download = `skill-matrix-${orientation}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      Swal.fire({
        icon: "success",
        title: "ดาวน์โหลดรูปภาพสำเร็จ!",
        text: `บันทึกรูปภาพสัดส่วน ${orientation === "landscape" ? "16:9 แนวนอน" : "9:16 แนวตั้ง"} เรียบร้อย`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      console.error("Export error:", err);
      const msg = err instanceof Error ? err.message : "ไม่สามารถสร้างรูปภาพได้";
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาดในการบันทึกรูปภาพ",
        text: msg,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[100] m-0 flex items-center justify-center p-3 sm:p-4 bg-black/80">
      <div className="bg-card text-card-foreground rounded-2xl shadow-2xl border border-border w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                ส่งออกรูปภาพทักษะ & คุณสมบัติ (16:9)
              </h3>
              <p className="text-xs text-muted-foreground">
                บันทึกเป็นรูปภาพความละเอียดสูงสำหรับแชร์ หรือตั้งเป็นภาพหน้าจอ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: แบ่ง 2 คอลัมน์ (แผงควบคุม & พรีวิว) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-6">
          {/* แผงตั้งค่า (ซ้าย 4 คอลัมน์) */}
          <div className="lg:col-span-4 space-y-4 text-xs">
            {/* 1. เลือกแนว (Orientation) */}
            <div className="space-y-2">
              <label className="font-semibold text-foreground uppercase tracking-wider block">
                สัดส่วนและทิศทาง
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation("landscape")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                    orientation === "landscape"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  แนวนอน (16:9)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("portrait")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                    orientation === "portrait"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  แนวตั้ง (9:16)
                </button>
              </div>
            </div>

            {/* 2. หัวข้อโปสเตอร์ */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground uppercase tracking-wider block">
                หัวข้อบนภาพ (Header Title)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="MY SKILL MATRIX 2026"
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
            </div>

            {/* 3. เลือกคุณสมบัติที่จะแสดง */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground uppercase tracking-wider">
                  เลือกทักษะที่จะแสดง ({selectedIds.length}/{qualities.length})
                </label>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-primary hover:underline text-[11px] font-medium"
                >
                  เลือกทั้งหมด
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-border bg-muted/20">
                {qualities.map((q) => {
                  const isChecked = selectedIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleQuality(q.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-primary/10 border border-primary/30 text-foreground"
                          : "hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: q.color || "#2563eb" }}
                        >
                          <QualityIconRenderer iconName={q.icon} className="w-3 h-3" />
                        </div>
                        <span className="font-medium truncate">{q.name}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          isChecked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Download Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs shadow-sm transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังเรนเดอร์รูปภาพ...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    บันทึกรูปภาพ ({orientation === "landscape" ? "16:9" : "9:16"})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* แผงพรีวิวสด (ขวา 8 คอลัมน์) */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center p-3 sm:p-5 rounded-2xl bg-zinc-950/80 border border-border/80 overflow-hidden min-h-[380px]">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 self-start">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              LIVE CANVAS PREVIEW // {orientation.toUpperCase()} (16:9 RATIO)
            </span>

            {/* Container จัดขนาดตามอัตราส่วน 16:9 เพื่อ Capture */}
            <div className="w-full flex items-center justify-center overflow-auto p-2">
              <div
                ref={cardRef}
                style={{
                  aspectRatio: orientation === "landscape" ? "16 / 9" : "9 / 16",
                  width: orientation === "landscape" ? "680px" : "360px",
                }}
                className="bg-zinc-950 text-zinc-100 p-5 rounded-2xl border-2 border-zinc-800 shadow-2xl flex flex-col justify-between font-mono relative overflow-hidden select-none"
              >
                {/* Tech Background Grid Lines */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #3f3f46 1px, transparent 1px), linear-gradient(to bottom, #3f3f46 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />

                {/* Corner Accents */}
                <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden pointer-events-none">
                  <div className="w-24 h-3 bg-indigo-500 transform rotate-45 translate-x-5 -translate-y-3 opacity-80" />
                </div>

                {/* Top Poster Header */}
                <div className="relative z-10 border-b border-zinc-800 pb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[9px] tracking-widest text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> PERSONAL TELEMETRY & ATTRIBUTES
                    </div>
                    <h2 className="text-sm sm:text-base font-black tracking-tight text-white mt-0.5 truncate max-w-[420px]">
                      {title}
                    </h2>
                  </div>

                  {/* แต้มรวม badge */}
                  <div className="text-right shrink-0">
                    <span className="text-[9px] text-zinc-400 block tracking-wider">
                      TOTAL ENERGY
                    </span>
                    <span className="text-sm font-black text-amber-400">
                      {totalPoints.toLocaleString()} <span className="text-[9px] font-normal text-zinc-300">PTS</span>
                    </span>
                  </div>
                </div>

                {/* Grid แสดงการ์ดทักษะที่เลือก */}
                <div
                  className={`relative z-10 my-auto py-3 gap-2.5 grid ${
                    orientation === "landscape"
                      ? displayedQualities.length <= 4
                        ? "grid-cols-2 sm:grid-cols-4"
                        : displayedQualities.length <= 6
                        ? "grid-cols-3"
                        : "grid-cols-3 sm:grid-cols-4"
                      : "grid-cols-1 sm:grid-cols-2"
                  }`}
                >
                  {displayedQualities.map((item) => {
                    const lvl = getLevelInfo(item.points);
                    const progress = getLevelProgress(item.points);
                    const toNext = getPointsToNextLevel(item.points);
                    const count = countMap.get(item.id) || 0;

                    return (
                      <div
                        key={item.id}
                        className="bg-zinc-900/90 rounded-xl p-2.5 border border-zinc-800 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                              style={{ backgroundColor: item.color || "#2563eb" }}
                            >
                              <QualityIconRenderer iconName={item.icon} className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[11px] font-bold text-white block truncate">
                                {item.name}
                              </span>
                              <span className="text-[9px] text-zinc-400 truncate block">
                                {lvl.emoji} Lv.{lvl.level} {lvl.name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-baseline justify-between text-[10px] text-zinc-300 font-bold mb-1">
                            <span>{item.points.toLocaleString()} PTS</span>
                            <span className="text-[9px] text-zinc-400 font-normal">
                              {count} SESSIONS
                            </span>
                          </div>

                          {/* Mini Progress */}
                          <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: item.color || "#6366f1",
                              }}
                            />
                          </div>
                        </div>

                        <div className="pt-1.5 mt-1 border-t border-zinc-800/80 flex items-center justify-between text-[8px] text-zinc-500">
                          <span>SYNC {progress}%</span>
                          <span>{toNext !== null ? `+${toNext} NEXT` : "MAX"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Poster */}
                <div className="relative z-10 border-t border-zinc-800 pt-2 flex items-center justify-between text-[8px] text-zinc-500 tracking-wider">
                  <span>VERIFIED ATTRIBUTE SYSTEM // 2026</span>
                  <span className="text-zinc-400 font-semibold">
                    GENERATED ON {new Date().toLocaleDateString("en-GB")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
