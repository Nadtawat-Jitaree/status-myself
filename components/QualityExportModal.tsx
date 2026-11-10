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
  Radio,
  Image as ImageIcon,
  Loader2,
  Share2,
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
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ติดตามขนาดของ Preview Container เพื่อทำการ Responsive Scale สำหรับจอมือถือ
  useEffect(() => {
    if (!isOpen || !mounted) return;

    const updateWidth = () => {
      if (previewContainerRef.current) {
        setContainerWidth(previewContainerRef.current.clientWidth);
      }
    };

    updateWidth();
    const timer = setTimeout(updateWidth, 120);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && previewContainerRef.current) {
      ro = new ResizeObserver(updateWidth);
      ro.observe(previewContainerRef.current);
    }

    window.addEventListener("resize", updateWidth);
    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, [isOpen, mounted, orientation]);

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

  // ขนาดมาตรฐานคงที่ของโปสเตอร์ (Pixel Dimension ที่แน่นอน ไม่ขึ้นกับขนาดหน้าจอมือถือ)
  // แนวนอน (16:9): 760 x 428
  // แนวตั้ง (9:16): 420 x 747
  const baseWidth = orientation === "landscape" ? 760 : 420;
  const baseHeight = orientation === "landscape" ? 428 : 747;

  // คำนวณ Scale สำหรับการแสดงผลบนจอมือถือโดยเฉพาะ ให้ไม่ล้นจอและไม่ต้องเลื่อนแนวนอน
  const availableWidth = containerWidth > 0 ? containerWidth - 28 : baseWidth;
  const previewScale = Math.min(1, Math.max(0.32, availableWidth / baseWidth));

  // คำนวณ Grid Layout ภายในโปสเตอร์ตามจำนวนทักษะที่เลือก โดยไม่พึ่งพา Tailwind media query (sm:, md:)
  // เพื่อให้เรนเดอร์ใน html-to-image บนมือถือและเดสก์ท็อปได้ผลลัพธ์ที่สมบูรณ์ 100% เหมือนกัน
  const count = displayedQualities.length;
  const isCompact = orientation === "landscape" ? count > 8 : count > 6;
  const isVeryCompact = orientation === "landscape" ? count > 12 : count > 10;

  let gridColsClass = "grid-cols-4";
  if (orientation === "landscape") {
    if (count <= 2) gridColsClass = "grid-cols-2";
    else if (count <= 4) gridColsClass = "grid-cols-4";
    else if (count <= 6) gridColsClass = "grid-cols-3";
    else if (count <= 8) gridColsClass = "grid-cols-4";
    else if (count <= 12) gridColsClass = "grid-cols-4";
    else gridColsClass = "grid-cols-5";
  } else {
    // portrait (9:16)
    if (count <= 3) gridColsClass = "grid-cols-1";
    else if (count <= 8) gridColsClass = "grid-cols-2";
    else gridColsClass = "grid-cols-2";
  }

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      // หน่วงเวลาเล็กน้อยเพื่อให้ SVG icons และ CSS layout คำนวณครบถ้วน
      await new Promise((resolve) => setTimeout(resolve, 250));

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        width: baseWidth,
        height: baseHeight,
        pixelRatio: 2.5, // ความละเอียดสูง คมชัดเป็นพิเศษ (1900x1070 หรือ 1050x1868)
        backgroundColor: "#09090b",
        style: {
          width: `${baseWidth}px`,
          height: `${baseHeight}px`,
          transform: "none",
          margin: "0",
        },
      });

      const fileName = `skill-matrix-${orientation}-${Date.now()}.png`;

      // ถ้าเป็นมือถือที่รองรับ Web Share API ให้แสดงแชร์ชีต (บันทึกรูปลง Photos/Gallery ได้ทันที)
      let shared = false;
      if (typeof navigator !== "undefined" && navigator.canShare) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "My Skill Matrix",
              text: "ภาพสรุปทักษะ & คุณสมบัติของฉัน",
            });
            shared = true;
          }
        } catch (shareErr) {
          if (shareErr instanceof Error && shareErr.name === "AbortError") {
            setIsExporting(false);
            return;
          }
        }
      }

      if (!shared) {
        const link = document.createElement("a");
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Swal.fire({
          icon: "success",
          title: "ดาวน์โหลดรูปภาพสำเร็จ!",
          text: `บันทึกรูปภาพสัดส่วน ${orientation === "landscape" ? "16:9 แนวนอน" : "9:16 แนวตั้ง"} ความละเอียดสูงเรียบร้อย`,
          timer: 2000,
          showConfirmButton: false,
        });
      }
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
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[100] m-0 flex items-center justify-center p-2 sm:p-4 bg-black/80">
      <div className="bg-card text-card-foreground rounded-2xl shadow-2xl border border-border w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                ส่งออกรูปภาพทักษะ & คุณสมบัติ
              </h3>
              <p className="text-xs text-muted-foreground">
                บันทึกรูปภาพความละเอียดสูง สัดส่วน 16:9 หรือ 9:16 แบบเต็มแผ่น
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: บนมือถือแสดงพรีวิวอยู่ด้านบน และตั้งค่าด้านล่าง / บนจอใหญ่แบ่ง 2 คอลัมน์ */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 p-3 sm:p-6">
          {/* แผงพรีวิวสด (บนมือถือขึ้นก่อน เพื่อให้เห็นผลลัพธ์ทันที) */}
          <div className="lg:col-span-8 order-1 lg:order-2 flex flex-col">
            <div
              ref={previewContainerRef}
              className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 rounded-2xl bg-zinc-950 border border-border/80 overflow-hidden min-h-[260px] sm:min-h-[360px]"
            >
              <div className="w-full flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  LIVE PREVIEW // {orientation.toUpperCase()} ({orientation === "landscape" ? "16:9" : "9:16"})
                </span>
                {previewScale < 1 && (
                  <span className="text-zinc-500 text-[9px]">
                    ย่อแสดงผล {Math.round(previewScale * 100)}% (ภาพจริงขนาดเต็ม)
                  </span>
                )}
              </div>

              {/* Responsive Scaled Canvas Container: จอมือถือจะย่อขนาดแสดงผลอัตโนมัติ ไม่ล้น ไม่ถูกตัด */}
              <div
                style={{
                  width: `${baseWidth * previewScale}px`,
                  height: `${baseHeight * previewScale}px`,
                  position: "relative",
                }}
                className="transition-all duration-150"
              >
                <div
                  style={{
                    width: `${baseWidth}px`,
                    height: `${baseHeight}px`,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  {/* กล่องเป้าหมายที่จะถูกจับภาพ (ขนาดคงที่ baseWidth x baseHeight ไม่ขึ้นกับ viewport มือถือ) */}
                  <div
                    ref={cardRef}
                    style={{
                      width: `${baseWidth}px`,
                      height: `${baseHeight}px`,
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

                    {/* Corner Accent */}
                    <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden pointer-events-none">
                      <div className="w-24 h-3 bg-indigo-500 transform rotate-45 translate-x-5 -translate-y-3 opacity-80" />
                    </div>

                    {/* Top Poster Header */}
                    <div className="relative z-10 border-b border-zinc-800 pb-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[9px] tracking-widest text-indigo-400 flex items-center gap-1.5 font-bold">
                          <Sparkles className="w-3 h-3 shrink-0" /> PERSONAL TELEMETRY & ATTRIBUTES
                        </div>
                        <h2 className="text-sm font-black tracking-tight text-white mt-0.5 truncate max-w-[460px]">
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

                    {/* Grid แสดงการ์ดทักษะที่เลือก (จัดแบบ Auto Grid คำนวณคงที่ ไม่มี sm:) */}
                    <div className={`relative z-10 my-auto py-2.5 gap-2.5 grid ${gridColsClass}`}>
                      {displayedQualities.map((item) => {
                        const lvl = getLevelInfo(item.points);
                        const progress = getLevelProgress(item.points);
                        const toNext = getPointsToNextLevel(item.points);
                        const countSessions = countMap.get(item.id) || 0;

                        return (
                          <div
                            key={item.id}
                            className={`bg-zinc-900/90 rounded-xl border border-zinc-800 flex flex-col justify-between ${
                              isVeryCompact ? "p-1.5" : isCompact ? "p-2" : "p-2.5"
                            }`}
                          >
                            <div>
                              <div className={`flex items-center gap-2 ${isCompact ? "mb-1" : "mb-1.5"}`}>
                                <div
                                  className={`${isCompact ? "w-6 h-6" : "w-7 h-7"} rounded-lg flex items-center justify-center text-white shrink-0`}
                                  style={{ backgroundColor: item.color || "#2563eb" }}
                                >
                                  <QualityIconRenderer iconName={item.icon} className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className={`${isVeryCompact ? "text-[10px]" : "text-[11px]"} font-bold text-white block truncate`}>
                                    {item.name}
                                  </span>
                                  <span className="text-[9px] text-zinc-400 truncate block">
                                    {lvl.emoji} Lv.{lvl.level} {lvl.name}
                                  </span>
                                </div>
                              </div>

                              <div className={`flex items-baseline justify-between text-[10px] text-zinc-300 font-bold ${isCompact ? "mb-0.5" : "mb-1"}`}>
                                <span>{item.points.toLocaleString()} PTS</span>
                                <span className="text-[9px] text-zinc-400 font-normal">
                                  {countSessions} SESSIONS
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

                            <div className="pt-1 mt-1 border-t border-zinc-800/80 flex items-center justify-between text-[8px] text-zinc-500">
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

          {/* แผงตั้งค่าและปุ่มดาวน์โหลด (ซ้าย 4 คอลัมน์บนจอใหญ่, ล่างบนจอมือถือ) */}
          <div className="lg:col-span-4 order-2 lg:order-1 space-y-3.5 text-xs">
            {/* 1. ปุ่มดาวน์โหลดเด่นชัด */}
            <div>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังประมวลผลรูปภาพ...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    บันทึกรูปภาพ ({orientation === "landscape" ? "16:9 แนวนอน" : "9:16 แนวตั้ง"})
                  </>
                )}
              </button>
            </div>

            {/* 2. เลือกแนว (Orientation) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground uppercase tracking-wider block text-[11px]">
                สัดส่วนและทิศทาง
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation("landscape")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-md border text-xs font-semibold transition-colors ${
                    orientation === "landscape"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  แนวนอน (16:9)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("portrait")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-md border text-xs font-semibold transition-colors ${
                    orientation === "portrait"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  แนวตั้ง (9:16)
                </button>
              </div>
            </div>

            {/* 3. หัวข้อโปสเตอร์ */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground uppercase tracking-wider block text-[11px]">
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

            {/* 4. เลือกทักษะที่จะแสดง */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
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

              <div className="max-h-44 sm:max-h-52 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-border bg-muted/20">
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
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
