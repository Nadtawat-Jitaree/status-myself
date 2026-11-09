"use client";

import React, { useState, useMemo } from "react";
import {
  Quality,
  QualityTransaction,
  createQuality,
  updateQuality,
  deleteQuality,
} from "@/app/actions/qualities";
import { QualityIconRenderer } from "@/lib/lucide-icons";
import { QualityFormModal } from "./QualityFormModal";
import { QualityExportModal } from "./QualityExportModal";
import {
  Plus,
  Pencil,
  Trash2,
  Trophy,
  History,
  Sparkles,
  Layers,
  Calendar,
  FileText,
  FolderKanban,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Flame,
  Zap,
  Radio,
  BarChart2,
  Share2,
  Download,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  getLevelInfo,
  getLevelProgress,
  getPointsToNextLevel,
  QUALITY_LEVELS,
} from "@/lib/quality-levels";

interface QualityManagerProps {
  initialQualities: Quality[];
  initialTransactions: QualityTransaction[];
}

export function QualityManager({
  initialQualities,
  initialTransactions,
}: QualityManagerProps) {
  const [qualities, setQualities] = useState<Quality[]>(initialQualities);
  const [transactions, setTransactions] =
    useState<QualityTransaction[]>(initialTransactions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuality, setEditingQuality] = useState<Quality | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"qualities" | "tech_cards" | "transactions">(
    "qualities"
  );

  // คำนวณแต้มรวมทั้งหมด
  const totalPoints = qualities.reduce((acc, q) => acc + (q.points || 0), 0);

  // คำนวณ Telemetry Stats ของแต่ละ Quality จาก Transactions
  const qualityStatsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        lastDate: string | null;
        level1Count: number;
        level3Count: number;
        level5Count: number;
      }
    >();

    qualities.forEach((q) => {
      map.set(q.id, {
        count: 0,
        lastDate: null,
        level1Count: 0,
        level3Count: 0,
        level5Count: 0,
      });
    });

    transactions.forEach((tx) => {
      const stat = map.get(tx.quality_id);
      if (stat) {
        stat.count += 1;
        if (!stat.lastDate) {
          stat.lastDate = tx.created_at;
        }
        if (tx.points_delta === 1) stat.level1Count += 1;
        else if (tx.points_delta === 3) stat.level3Count += 1;
        else if (tx.points_delta === 5) stat.level5Count += 1;
      }
    });

    return map;
  }, [qualities, transactions]);

  const handleCreateOrUpdate = async (data: {
    name: string;
    icon: string;
    color: string;
    description: string;
  }) => {
    try {
      setLoading(true);
      if (editingQuality) {
        await updateQuality(editingQuality.id, data);
        setQualities((prev) =>
          prev.map((q) => (q.id === editingQuality.id ? { ...q, ...data } : q))
        );
        Swal.fire({
          icon: "success",
          title: "แก้ไขสำเร็จ",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        const res = await createQuality(data);
        if (res.data) {
          setQualities((prev) => [res.data as Quality, ...prev]);
        }
        Swal.fire({
          icon: "success",
          title: "สร้างทักษะสำเร็จ",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      setIsModalOpen(false);
      setEditingQuality(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      Swal.fire({
        icon: "error",
        title: "ผิดพลาด",
        text: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (quality: Quality) => {
    const result = await Swal.fire({
      title: `ลบทักษะ "${quality.name}"?`,
      text: "ประวัติแต้มและสถิติของทักษะนี้จะถูกลบออกด้วย",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบทักษะ",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      try {
        await deleteQuality(quality.id);
        setQualities((prev) => prev.filter((q) => q.id !== quality.id));
        setTransactions((prev) =>
          prev.filter((tx) => tx.quality_id !== quality.id)
        );
        Swal.fire({
          icon: "success",
          title: "ลบสำเร็จ",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบ";
        Swal.fire({
          icon: "error",
          title: "ผิดพลาด",
          text: msg,
        });
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header Card — สไตล์คลีนแบบเดียวกับ Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl border border-border bg-card">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="w-3.5 h-3.5" /> ระบบพัฒนาตนเอง & แต้มทักษะ
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            ทักษะ & สถิติแต้ม
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            ตั้งค่าทักษะที่ต้องการฝึกฝน แล้วเลือกรับแต้มตอนเขียนโน้ตเพื่อบันทึกการเติบโต
          </p>
        </div>

        {/* Card แสดงแต้มรวม */}
        <div className="flex items-center gap-3.5 p-3 sm:p-4 rounded-xl border border-border bg-muted/40 self-start sm:self-auto min-w-[200px]">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground block font-medium">
              แต้มสะสมรวม
            </span>
            <span className="text-2xl font-bold text-foreground">
              {totalPoints.toLocaleString()}{" "}
              <span className="text-xs font-normal text-muted-foreground">แต้ม</span>
            </span>
          </div>
        </div>
      </div>

      {/* Level Reference Table */}
      <details className="group border border-border rounded-xl overflow-hidden">
        <summary className="flex items-center justify-between cursor-pointer p-3 bg-muted/30 hover:bg-muted/50 transition-colors list-none">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            ตารางระดับทั้งหมด — 10 Level
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition-transform" />
        </summary>
        <div className="p-3 bg-card">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {QUALITY_LEVELS.map((lvl) => (
              <div
                key={lvl.level}
                className="flex items-center gap-2 p-2 rounded-lg border border-border text-xs"
              >
                <span className="text-base">{lvl.emoji}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-foreground truncate">
                    Lv.{lvl.level} {lvl.name}
                  </div>
                  <div className="text-muted-foreground">
                    {lvl.minPoints}
                    {lvl.maxPoints === -1 ? "+" : `–${lvl.maxPoints}`} แต้ม
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* Tabs & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Tab 1: รายการทั่วไป */}
          <button
            onClick={() => setActiveTab("qualities")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors shrink-0 ${
              activeTab === "qualities"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Layers className="w-4 h-4" />
            รายการทักษะ ({qualities.length})
          </button>

          {/* Tab 2: Cyberpunk / Tech Cards (สไตล์ที่ 3) */}
          <button
            onClick={() => setActiveTab("tech_cards")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors shrink-0 ${
              activeTab === "tech_cards"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Cpu className="w-4 h-4" />
            การ์ดสถานะ Sci-Fi (HUD)
          </button>

          {/* Tab 3: ประวัติแต้ม */}
          <button
            onClick={() => setActiveTab("transactions")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors shrink-0 ${
              activeTab === "transactions"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <History className="w-4 h-4" />
            ประวัติแต้ม ({transactions.length})
          </button>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {qualities.length > 0 && (
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs sm:text-sm font-semibold transition-colors"
              title="ส่งออกรูปภาพสำหรับแชร์ (สัดส่วน 16:9)"
            >
              <Download className="w-4 h-4 text-primary" />
              บันทึกรูปภาพ (16:9)
            </button>
          )}

          {activeTab !== "transactions" && (
            <button
              onClick={() => {
                setEditingQuality(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs sm:text-sm font-semibold transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              สร้างทักษะใหม่
            </button>
          )}
        </div>
      </div>

      {/* Content Section 1: Standard List View */}
      {activeTab === "qualities" && (
        <div>
          {qualities.length === 0 ? (
            <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  ยังไม่มีทักษะในระบบ
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  เริ่มต้นโดยการสร้างทักษะ เช่น ออกกำลังกาย, การอ่านหนังสือ หรือสมาธิ
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingQuality(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                สร้างทักษะแรก
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {qualities.map((item) => (
                <div
                  key={item.id}
                  className="bg-card rounded-2xl p-4 border border-border transition-colors hover:border-foreground/20 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: item.color || "#2563eb" }}
                        >
                          <QualityIconRenderer
                            iconName={item.icon}
                            className="w-5 h-5"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground text-sm truncate">
                            {item.name}
                          </h3>
                          <span className="text-xs font-medium text-muted-foreground block">
                            {item.points.toLocaleString()} แต้มสะสม
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingQuality(item);
                            setIsModalOpen(true);
                          }}
                          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="แก้ไข"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Level Progress */}
                  <div className="pt-3 mt-3 border-t border-border/60 space-y-1.5">
                    {(() => {
                      const lvl = getLevelInfo(item.points);
                      const progress = getLevelProgress(item.points);
                      const toNext = getPointsToNextLevel(item.points);
                      return (
                        <>
                          <div className="flex items-center justify-between text-[11px]">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-md ${lvl.bgColor} ${lvl.color}`}
                            >
                              {lvl.emoji} Lv.{lvl.level} {lvl.name}
                            </span>
                            <span className="text-muted-foreground">
                              {toNext !== null
                                ? `อีก ${toNext} แต้ม`
                                : "ระดับสูงสุด! 🔥"}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Section 2: Cyberpunk / Tech Stats HUD (สไตล์ที่ 3) */}
      {activeTab === "tech_cards" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-mono">
              <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
              STATUS TELEMETRY MATRIX // REAL-TIME ACTIVE HUD
            </span>
            <span className="font-mono">ONLINE UNITS: {qualities.length}</span>
          </div>

          {qualities.length === 0 ? (
            <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl p-6 font-mono text-sm text-muted-foreground">
              [SYSTEM WARNING: NO ACTIVE ATTRIBUTE MODULE DETECTED]
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {qualities.map((item, index) => {
                const lvl = getLevelInfo(item.points);
                const progress = getLevelProgress(item.points);
                const toNext = getPointsToNextLevel(item.points);
                const stats = qualityStatsMap.get(item.id) || {
                  count: 0,
                  lastDate: null,
                  level1Count: 0,
                  level3Count: 0,
                  level5Count: 0,
                };

                // คำนวณ segmented blocks เช่น 10 segments
                const totalBlocks = 10;
                const filledBlocks = Math.round((progress / 100) * totalBlocks);

                return (
                  <div
                    key={item.id}
                    className="relative bg-card rounded-2xl border border-border/80 hover:border-primary/50 transition-colors p-4 flex flex-col justify-between font-mono overflow-hidden group shadow-xs"
                  >
                    {/* Corner Tech Decorative Accents */}
                    <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none overflow-hidden">
                      <div
                        className="w-16 h-2 transform rotate-45 translate-x-3 -translate-y-2 opacity-60"
                        style={{ backgroundColor: item.color || "#2563eb" }}
                      />
                    </div>

                    <div className="space-y-3">
                      {/* Top HUD Line */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/50 pb-2">
                        <span className="tracking-widest flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full inline-block"
                            style={{ backgroundColor: item.color || "#2563eb" }}
                          />
                          SYS.ATTR // {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="font-semibold text-foreground">
                          TIER-{lvl.level}
                        </span>
                      </div>

                      {/* Header Module (Icon + Name + Rank) */}
                      <div className="flex items-start gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 border border-black/10 relative"
                          style={{ backgroundColor: item.color || "#2563eb" }}
                        >
                          <QualityIconRenderer
                            iconName={item.icon}
                            className="w-6 h-6"
                          />
                          <span className="absolute -bottom-1 -right-1 text-xs">
                            {lvl.emoji}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-foreground text-base tracking-tight truncate font-sans">
                              {item.name}
                            </h3>
                          </div>
                          <span className="text-[11px] text-muted-foreground block truncate">
                            LV.{lvl.level} {lvl.name.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Power Level Display */}
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            POWER LEVEL
                          </span>
                          <span className="text-xl font-black text-foreground">
                            {item.points.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground ml-1">
                              PTS
                            </span>
                          </span>
                        </div>

                        {/* Segmented Progress Blocks (■■■■□□□□) */}
                        <div className="mt-2 space-y-1">
                          <div className="flex gap-1 h-1.5 w-full">
                            {Array.from({ length: totalBlocks }).map((_, bIdx) => (
                              <div
                                key={bIdx}
                                className={`flex-1 rounded-xs transition-colors ${
                                  bIdx < filledBlocks
                                    ? "bg-primary"
                                    : "bg-muted-foreground/20"
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                            <span>SYNC {progress}%</span>
                            <span>
                              {toNext !== null
                                ? `REQ +${toNext} PTS`
                                : "OVERDRIVE MAX"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description (if any) */}
                      {item.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 italic font-sans">
                          &quot;{item.description}&quot;
                        </p>
                      )}

                      {/* Telemetry Stats Grid */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                        <div className="p-2 rounded-lg bg-background border border-border/70">
                          <span className="text-muted-foreground block flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-500" />
                            SESSIONS
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {stats.count} ครั้ง
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-background border border-border/70">
                          <span className="text-muted-foreground block flex items-center gap-1">
                            <BarChart2 className="w-3 h-3 text-blue-500" />
                            PEAK BOOST
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {stats.level5Count > 0
                              ? "+5 แต้ม (มาก)"
                              : stats.level3Count > 0
                              ? "+3 แต้ม (กลาง)"
                              : stats.level1Count > 0
                              ? "+1 แต้ม (ปกติ)"
                              : "READY"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer HUD */}
                    <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>
                        LAST SYNC:{" "}
                        {stats.lastDate
                          ? new Date(stats.lastDate).toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                            })
                          : "NONE"}
                      </span>
                      <button
                        onClick={() => {
                          setEditingQuality(item);
                          setIsModalOpen(true);
                        }}
                        className="text-primary hover:underline font-semibold"
                      >
                        [CONFIG]
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Content Section 3: Transactions Table */}
      {activeTab === "transactions" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              ประวัติการได้รับแต้มทักษะ
            </h3>
            <span className="text-xs text-muted-foreground">
              {transactions.length} รายการล่าสุด
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center text-xs sm:text-sm text-muted-foreground">
              ยังไม่มีประวัติการได้รับแต้ม เขียนโน้ตและเลือกทักษะเพื่อรับแต้ม
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground text-xs font-medium border-b border-border">
                    <th className="py-2.5 px-4 font-medium">วันและเวลา</th>
                    <th className="py-2.5 px-4 font-medium">ทักษะ</th>
                    <th className="py-2.5 px-4 font-medium">จากบันทึก Note</th>
                    <th className="py-2.5 px-4 font-medium">ระดับ</th>
                    <th className="py-2.5 px-4 font-medium text-right">แต้ม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {new Date(tx.created_at).toLocaleString("th-TH", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-foreground">
                            <QualityIconRenderer
                              iconName={tx.quality_icon || "Star"}
                              className="w-3.5 h-3.5"
                            />
                          </div>
                          <span className="font-medium text-foreground">
                            {tx.quality_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5 text-foreground">
                          {tx.source === "task" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="truncate max-w-xs block">
                            {tx.source === "task"
                              ? `${tx.task_title || "งานในโปรเจกต์"}${tx.project_name ? ` (${tx.project_name})` : ""}`
                              : tx.note_title || "โน้ตทั่วไป"}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-medium text-[11px] ${
                            tx.points_delta === 5
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : tx.points_delta === 3
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {tx.level_label || `+${tx.points_delta}`}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap font-bold text-foreground">
                        +{tx.points_delta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal จัดการทักษะ */}
      <QualityFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingQuality(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingQuality}
        loading={loading}
      />

      {/* Modal ส่งออกรูปภาพ 16:9 */}
      <QualityExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        qualities={qualities}
        transactions={transactions}
      />
    </div>
  );
}
