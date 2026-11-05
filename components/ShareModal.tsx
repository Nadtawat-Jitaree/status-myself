"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Globe,
  Lock,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import {
  toggleShareNote,
  regenerateNoteShareToken,
  toggleShareCategory,
  regenerateCategoryShareToken,
} from "@/app/actions/share";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "note" | "category";
  item: {
    id: string;
    title?: string;
    name?: string;
    is_shared?: boolean;
    share_token?: string | null;
  } | null;
  onUpdate: (updatedData: { is_shared: boolean; share_token: string | null }) => void;
}

export default function ShareModal({
  isOpen,
  onClose,
  type,
  item,
  onUpdate,
}: ShareModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !item || !mounted) return null;

  const isShared = Boolean(item.is_shared);
  const shareToken = item.share_token;
  const isV2HashedToken = shareToken ? shareToken.length >= 34 : false;
  const itemName = type === "note" ? item.title || "ไม่มีชื่อ" : item.name || "ไม่มีชื่อ";

  const getOrigin = () => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  };

  const shareUrl = shareToken
    ? `${getOrigin()}/share/${type}/${shareToken}`
    : "";

  const handleToggleShare = async () => {
    setIsUpdating(true);
    try {
      const result =
        type === "note"
          ? await toggleShareNote(item.id)
          : await toggleShareCategory(item.id);

      onUpdate({
        is_shared: result.is_shared,
        share_token: result.share_token,
      });

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: result.is_shared
          ? "เปิดการแชร์ลิงก์แล้ว 🌐"
          : "ปิดการแชร์ลิงก์แล้ว 🔒",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถเปลี่ยนสถานะการแชร์ได้",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRegenerate = async () => {
    const confirm = await Swal.fire({
      title: "สร้างลิงก์ใหม่?",
      text: "ลิงก์เดิมที่เคยส่งให้คนอื่นจะไม่สามารถเข้าถึงได้อีกต่อไป",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0284c7",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, สร้างลิงก์ใหม่",
      cancelButtonText: "ยกเลิก",
    });

    if (!confirm.isConfirmed) return;

    setIsUpdating(true);
    try {
      const result =
        type === "note"
          ? await regenerateNoteShareToken(item.id)
          : await regenerateCategoryShareToken(item.id);

      onUpdate({
        is_shared: true,
        share_token: result.share_token,
      });

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "สร้างลิงก์ใหม่สำเร็จ",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถสร้างลิงก์ใหม่ได้",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "คัดลอกลิงก์แล้ว!",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (err) {
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถคัดลอกลิงก์ได้", "error");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-background rounded-3xl border shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                แชร์{type === "note" ? "บันทึก (Note)" : "หมวดหมู่ (Category)"}
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-[260px] sm:max-w-xs">
                {itemName}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full shrink-0"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6">
          {/* Status Box */}
          <div
            className={`flex items-center justify-between p-4 rounded-2xl border ${
              isShared
                ? "bg-sky-50/50 border-sky-200 dark:bg-sky-950/20 dark:border-sky-800"
                : "bg-muted/40 border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isShared
                    ? "bg-sky-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isShared ? (
                  <Globe className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {isShared ? "กำลังเปิดแชร์สาธารณะ" : "ความเป็นส่วนตัว (ปิดแชร์)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isShared
                    ? "ทุกคนที่มีลิงก์สามารถเปิดดูเนื้อหานี้ได้"
                    : "เฉพาะคุณคนเดียวเท่านั้นที่สามารถดูได้"}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant={isShared ? "destructive" : "default"}
              size="sm"
              disabled={isUpdating}
              onClick={handleToggleShare}
              className="rounded-xl px-4 text-xs font-medium"
            >
              {isUpdating
                ? "กำลังโหลด..."
                : isShared
                ? "ปิดการแชร์"
                : "เปิดการแชร์"}
            </Button>
          </div>

          {/* Share Link Section */}
          {isShared && shareToken && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-foreground">
                ลิงก์สำหรับแชร์:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 h-10 px-3.5 rounded-xl border bg-muted/30 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/20 select-all"
                />
                <Button
                  type="button"
                  onClick={handleCopyLink}
                  className="h-10 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 text-xs font-medium shrink-0"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      คัดลอกแล้ว
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      คัดลอกลิงก์
                    </>
                  )}
                </Button>
              </div>

              {/* Action Buttons: Preview & Regenerate / Rehash */}
              <div className="flex items-center justify-between pt-2">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  เปิดดูหน้าเว็บที่แชร์
                </a>

                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium"
                  title="สร้างลิงก์ใหม่ (Rehash Token) ลิงก์เดิมจะใช้งานไม่ได้"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isUpdating ? "animate-spin" : ""}`}
                  />
                  {isV2HashedToken ? "รีเซ็ตลิงก์ (Rehash)" : "อัปเกรดเป็น Secure Token (Rehash)"}
                </button>
              </div>

              {/* Token Security Badge */}
              <div className="mt-2 p-2.5 rounded-xl border bg-muted/40 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  {isV2HashedToken ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                        ความปลอดภัยระดับสูง: SHA-256 Hashed Token
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-amber-700 dark:text-amber-400 font-medium">
                        Token รุ่นเดิม (v1) แนะนำกด <strong>Rehash</strong> เพื่ออัปเกรดความปลอดภัย
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/20 border-t flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl px-5"
            onClick={onClose}
          >
            ปิด
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
