"use client";

import React, { useState, useRef, useTransition } from "react";
import { ProfileRecord, updateProfile, uploadAvatarFile } from "@/app/actions/profile";
import { AVATAR_PRESETS, getPresetByName } from "@/lib/avatar-presets";
import { QualityIconRenderer } from "@/lib/lucide-icons";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { optimizeImageToWebP, OptimizedImageResult } from "@/lib/image-optimizer";
import {
  User,
  Upload,
  Sparkles,
  Check,
  Save,
  Image as ImageIcon,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

interface ProfileFormClientProps {
  initialProfile: ProfileRecord | null;
}

export function ProfileFormClient({ initialProfile }: ProfileFormClientProps) {
  const [displayName, setDisplayName] = useState(
    initialProfile?.display_name || initialProfile?.username || ""
  );
  const [avatarType, setAvatarType] = useState<"icon" | "upload">(
    (initialProfile?.avatar_type as "icon" | "upload") || "icon"
  );
  const [avatarIcon, setAvatarIcon] = useState(
    initialProfile?.avatar_icon || "User"
  );
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url || "");

  // Social Links
  const [instagramUrl, setInstagramUrl] = useState(
    initialProfile?.instagram_url || ""
  );
  const [facebookUrl, setFacebookUrl] = useState(
    initialProfile?.facebook_url || ""
  );
  const [youtubeUrl, setYoutubeUrl] = useState(
    initialProfile?.youtube_url || ""
  );
  const [tiktokUrl, setTiktokUrl] = useState(
    initialProfile?.tiktok_url || ""
  );

  // Upload & Optimize State
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedInfo, setOptimizedInfo] = useState<OptimizedImageResult | null>(
    null
  );
  const [uploadPendingFile, setUploadPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // จัดการเมื่อผู้ใช้เลือกไฟล์ภาพ
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ตรวจสอบว่าเป็นไฟล์รูปภาพ
    if (!file.type.startsWith("image/")) {
      Swal.fire("ชนิดไฟล์ไม่ถูกต้อง", "กรุณาเลือกไฟล์รูปภาพเท่านั้น", "error");
      return;
    }

    try {
      setIsOptimizing(true);
      // Optimize image to .webp client-side (Max 512x512, 0.85 quality)
      const result = await optimizeImageToWebP(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.85,
        fileNamePrefix: "avatar",
      });

      setOptimizedInfo(result);
      setUploadPendingFile(result.file);
      setAvatarUrl(result.previewUrl);
      setAvatarType("upload");
    } catch (err: any) {
      console.error("Optimization failed:", err);
      Swal.fire(
        "ไม่สามารถแปลงรูปภาพได้",
        err?.message || "เกิดข้อผิดพลาดในการประมวลผลรูปภาพ",
        "error"
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      Swal.fire("กรุณาระบุชื่อ", "ชื่อผู้ใช้งานจะต้องไม่เว้นว่าง", "warning");
      return;
    }

    startTransition(async () => {
      try {
        let finalAvatarUrl = avatarUrl;

        // ถ้ามีไฟล์ใหม่ที่รออัปโหลด
        if (avatarType === "upload" && uploadPendingFile) {
          const uploadData = new FormData();
          uploadData.append("file", uploadPendingFile);

          const uploadRes = await uploadAvatarFile(uploadData);
          if (uploadRes.success && uploadRes.filePath) {
            finalAvatarUrl = uploadRes.filePath;
          }
        }

        await updateProfile({
          display_name: displayName.trim(),
          avatar_type: avatarType,
          avatar_icon: avatarIcon,
          avatar_url: finalAvatarUrl,
          instagram_url: instagramUrl,
          facebook_url: facebookUrl,
          youtube_url: youtubeUrl,
          tiktok_url: tiktokUrl,
        });

        await Swal.fire({
          title: "บันทึกสำเร็จ!",
          text: "ข้อมูลโปรไฟล์ของคุณได้รับการอัปเดตเรียบร้อยแล้ว",
          icon: "success",
          timer: 1800,
          showConfirmButton: false,
        });

        router.refresh();
      } catch (err: any) {
        Swal.fire(
          "เกิดข้อผิดพลาด",
          err?.message || "ไม่สามารถบันทึกข้อมูลได้",
          "error"
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto py-6 sm:py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            แก้ไขโปรไฟล์
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            จัดการชื่อ รูปภาพโปรไฟล์ และช่องทางโซเชียลมีเดียที่จะแสดงบนกระดานสนทนา
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending || isOptimizing}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-sm shadow-indigo-500/20 active:scale-95 disabled:opacity-50 shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{isPending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</span>
        </button>
      </div>

      {/* Main Grid: Left is live preview, Right is inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Live Profile Preview Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 flex flex-col items-center text-center">
            <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mb-4">
              ตัวอย่างการแสดงผลบนบอร์ด
            </span>

            <div className="relative mb-3">
              <AvatarDisplay
                avatarType={avatarType}
                avatarIcon={avatarIcon}
                avatarUrl={avatarUrl}
                name={displayName}
                size="2xl"
                showBorder
              />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              {displayName || "ชื่อผู้ใช้งาน"}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              @{initialProfile?.username || "username"}
            </p>

            {/* Social pills preview */}
            <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
              {instagramUrl && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 font-medium border border-pink-200/60">
                  Instagram
                </span>
              )}
              {facebookUrl && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-200/60">
                  Facebook
                </span>
              )}
              {youtubeUrl && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-medium border border-red-200/60">
                  YouTube
                </span>
              )}
              {tiktokUrl && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-medium border border-slate-300">
                  TikTok
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-5 pt-4 border-t border-slate-100 w-full">
              ข้อมูลนี้จะปรากฏเมื่อสมาชิกท่านอื่นกดดูโปรไฟล์ของคุณ
            </p>
          </div>
        </div>

        {/* Right Column: Settings Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* 1. Display Name */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                ชื่อที่แสดง (Display Name)
              </h2>
            </div>

            <div className="space-y-1.5">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="เช่น ณัฐวัฒน์, John Doe..."
                required
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              <p className="text-[11px] text-slate-400">
                ชื่อนี้จะปรากฏให้คนอื่นเห็นบนกระดานสนทนาและในความคิดเห็น
              </p>
            </div>
          </div>

          {/* 2. Avatar Selection */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  รูปภาพโปรไฟล์ (Avatar)
                </h2>
              </div>

              {/* Mode Switcher */}
              <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAvatarType("icon")}
                  className={`px-3 py-1 rounded-lg transition ${
                    avatarType === "icon"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  เลือก Icon Preset (~30)
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarType("upload")}
                  className={`px-3 py-1 rounded-lg transition ${
                    avatarType === "upload"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  อัปโหลดรูปภาพตัวเอง
                </button>
              </div>
            </div>

            {/* TAB 1: Icon Preset Selection */}
            {avatarType === "icon" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  คลิกเลือกไอคอนสไตล์โมเดิร์นจาก Lucide เพื่อใช้เป็นตัวแทนโปรไฟล์ของคุณ:
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 max-h-72 overflow-y-auto p-2 bg-slate-50/70 rounded-2xl border border-slate-100">
                  {AVATAR_PRESETS.map((preset) => {
                    const isSelected = avatarIcon === preset.name;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setAvatarIcon(preset.name)}
                        className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center relative group ${
                          isSelected
                            ? "bg-white ring-2 ring-indigo-500 shadow-sm scale-105"
                            : "hover:bg-white hover:shadow-xs"
                        }`}
                        title={preset.label}
                      >
                        <div
                          className={`w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white shadow-xs ${preset.bgGradient}`}
                        >
                          <QualityIconRenderer
                            iconName={preset.name}
                            className="w-4 h-4"
                          />
                        </div>
                        <span className="text-[10px] text-slate-600 truncate w-full">
                          {preset.label.split(" ")[0]}
                        </span>
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: Upload Own Image with WebP Optimizer */}
            {avatarType === "upload" && (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif,image/heic"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/30 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      คลิกเพื่อเลือกไฟล์รูปภาพ หรือลากมาวางที่นี่
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      รองรับ PNG, JPG, WebP (ระบบจะแปลงและ Optimize เป็น .webp อัตโนมัติ)
                    </p>
                  </div>
                </div>

                {/* Status & Optimizer Details */}
                {isOptimizing && (
                  <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 text-sky-700 text-xs flex items-center gap-2 animate-pulse">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>กำลังประมวลผลรูปภาพและแปลงเป็น .webp...</span>
                  </div>
                )}

                {optimizedInfo && !isOptimizing && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold">
                          Optimize เป็น .webp สำเร็จ!
                        </p>
                        <p className="text-[11px] text-emerald-700">
                          ขนาดเดิม {optimizedInfo.originalSizeKB} KB ➔ ลดเหลือ{" "}
                          <span className="font-extrabold">{optimizedInfo.optimizedSizeKB} KB</span>
                          {" "}(ลดขนาดลง {optimizedInfo.reductionPercentage}%)
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-200/80 text-emerald-900 font-semibold text-[11px] self-start sm:self-center">
                      WebP 512x512
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Social Media Links */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                <ExternalLink className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  ช่องทางโซเชียลมีเดีย (Social Links)
                </h2>
                <p className="text-xs text-slate-400">
                  กรอกลิงก์โปรไฟล์ของคุณเพื่อให้ผู้ติดตามสามารถเข้าถึงได้เมื่อคลิกที่โปรไฟล์ของคุณ
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Instagram */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  <span>Instagram</span>
                </label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/yourname"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition"
                />
              </div>

              {/* Facebook */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>Facebook</span>
                </label>
                <input
                  type="url"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/yourname"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* YouTube */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600" />
                  <span>YouTube</span>
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@channel"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                />
              </div>

              {/* TikTok */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900" />
                  <span>TikTok</span>
                </label>
                <input
                  type="url"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://tiktok.com/@username"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800 transition"
                />
              </div>
            </div>
          </div>

          {/* Bottom Save Action */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending || isOptimizing}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-md shadow-indigo-500/30 active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isPending ? "กำลังบันทึกข้อมูล..." : "บันทึกข้อมูลโปรไฟล์"}</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
