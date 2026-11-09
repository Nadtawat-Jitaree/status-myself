"use client";

import React, { useState, useRef, useTransition } from "react";
import { ProfileRecord, updateProfile, uploadAvatarFile } from "@/app/actions/profile";
import { AVATAR_PRESETS } from "@/lib/avatar-presets";
import { QualityIconRenderer } from "@/lib/lucide-icons";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { optimizeImageToWebP, OptimizedImageResult } from "@/lib/image-optimizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  User,
  Upload,
  Sparkles,
  Check,
  Save,
  ExternalLink,
  Loader2,
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

    if (!file.type.startsWith("image/")) {
      Swal.fire("ชนิดไฟล์ไม่ถูกต้อง", "กรุณาเลือกไฟล์รูปภาพเท่านั้น", "error");
      return;
    }

    try {
      setIsOptimizing(true);
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

        setUploadPendingFile(null);
        setAvatarUrl(finalAvatarUrl);
        setOptimizedInfo(null);

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
    <div className="container mx-auto px-4 sm:px-8 py-8 sm:py-9 max-w-5xl flex flex-col gap-8 border-2 rounded-3xl relative">
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Page Header with Single Save Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b">
          <div>
            <h1 className="flex text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              <User className="mr-2.5 w-7 h-7 text-foreground" />
              แก้ไขโปรไฟล์
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              จัดการชื่อ รูปภาพโปรไฟล์ และช่องทางการติดต่อโซเชียลมีเดีย
            </p>
          </div>

          {/* ปุ่มบันทึกอันเดียวของหน้า อิงสีและสไตล์ rounded จากหน้า note */}
          <Button
            type="submit"
            disabled={isPending || isOptimizing}
            className="text-white gap-2 font-medium shrink-0"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                บันทึกข้อมูล
              </>
            )}
          </Button>
        </div>

        {/* Main Grid: Left is live preview, Right is inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Live Profile Preview Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="text-center pb-2">
                <CardDescription className="text-xs font-semibold tracking-wider uppercase text-foreground/80">
                  ตัวอย่างการแสดงผลบนบอร์ด
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col items-center text-center pt-2 pb-6">
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

                <h3 className="text-lg font-bold text-card-foreground">
                  {displayName || "ชื่อผู้ใช้งาน"}
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  @{initialProfile?.username || "username"}
                </p>

                {/* Social pills preview */}
                <div className="flex items-center gap-1.5 mt-4 flex-wrap justify-center">
                  {instagramUrl && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-700 dark:text-pink-400 font-medium border border-pink-500/20">
                      Instagram
                    </span>
                  )}
                  {facebookUrl && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium border border-blue-500/20">
                      Facebook
                    </span>
                  )}
                  {youtubeUrl && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-700 dark:text-red-400 font-medium border border-red-500/20">
                      YouTube
                    </span>
                  )}
                  {tiktokUrl && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-foreground font-medium border border-border">
                      TikTok
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground mt-5 pt-4 border-t border-border w-full">
                  ข้อมูลนี้จะปรากฏเมื่อสมาชิกท่านอื่นกดดูโปรไฟล์ของคุณ
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Settings Form Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Display Name */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-foreground" />
                  <CardTitle className="text-base font-bold">
                    ชื่อที่แสดง (Display Name)
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="เช่น ณัฐวัฒน์, John Doe..."
                  required
                />
                <p className="text-xs text-muted-foreground">
                  ชื่อนี้จะปรากฏให้คนอื่นเห็นบนกระดานสนทนาและในความคิดเห็น
                </p>
              </CardContent>
            </Card>

            {/* 2. Avatar Selection */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-foreground" />
                    <CardTitle className="text-base font-bold">
                      รูปภาพโปรไฟล์ (Avatar)
                    </CardTitle>
                  </div>

                  {/* Mode Switcher */}
                  <div className="flex p-1 bg-muted rounded-lg text-xs font-medium self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setAvatarType("icon")}
                      className={cn(
                        "px-3 py-1.5 rounded-md transition-colors cursor-pointer",
                        avatarType === "icon"
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      เลือก Icon Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarType("upload")}
                      className={cn(
                        "px-3 py-1.5 rounded-md transition-colors cursor-pointer",
                        avatarType === "upload"
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      อัปโหลดรูปภาพตัวเอง
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* TAB 1: Icon Preset Selection */}
                {avatarType === "icon" && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      คลิกเลือกไอคอนเพื่อใช้เป็นตัวแทนโปรไฟล์ของคุณ:
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 max-h-72 overflow-y-auto p-3 bg-muted/40 rounded-xl border">
                      {AVATAR_PRESETS.map((preset) => {
                        const isSelected = avatarIcon === preset.name;
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setAvatarIcon(preset.name)}
                            className={cn(
                              "p-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center relative group border cursor-pointer",
                              isSelected
                                ? "border-primary bg-background shadow-xs ring-1 ring-primary"
                                : "border-transparent bg-background/50 hover:bg-background hover:border-border"
                            )}
                            title={preset.label}
                          >
                            <div
                              className={cn(
                                "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white shadow-xs shrink-0 transition-transform group-hover:scale-105",
                                preset.bgGradient || "from-slate-700 to-slate-900"
                              )}
                            >
                              <QualityIconRenderer
                                iconName={preset.name}
                                className="w-5 h-5 text-white drop-shadow-xs"
                              />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground truncate w-full">
                              {preset.label.split(" ")[0]}
                            </span>
                            {isSelected && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
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
                      className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-muted text-foreground flex items-center justify-center group-hover:scale-110 transition">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          คลิกเพื่อเลือกไฟล์รูปภาพ หรือลากมาวางที่นี่
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          รองรับ PNG, JPG, WebP (ระบบจะแปลงและ Optimize เป็น .webp อัตโนมัติ)
                        </p>
                      </div>
                    </div>

                    {/* Status & Optimizer Details */}
                    {isOptimizing && (
                      <div className="p-4 rounded-xl bg-muted border border-border text-foreground text-xs flex items-center gap-2 animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>กำลังประมวลผลรูปภาพและแปลงเป็น .webp...</span>
                      </div>
                    )}

                    {optimizedInfo && !isOptimizing && (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold">
                              Optimize เป็น .webp สำเร็จ!
                            </p>
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                              ขนาดเดิม {optimizedInfo.originalSizeKB} KB ➔ ลดเหลือ{" "}
                              <span className="font-extrabold">{optimizedInfo.optimizedSizeKB} KB</span>
                              {" "}(ลดขนาดลง {optimizedInfo.reductionPercentage}%)
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-semibold text-[11px] self-start sm:self-center">
                          WebP 512x512
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. Social Media Links */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-foreground" />
                  <div>
                    <CardTitle className="text-base font-bold">
                      ช่องทางโซเชียลมีเดีย (Social Links)
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      กรอกลิงก์โปรไฟล์ของคุณเพื่อให้ผู้ติดตามสามารถเข้าถึงได้เมื่อคลิกที่โปรไฟล์ของคุณ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Instagram */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-pink-500" />
                      <span>Instagram</span>
                    </Label>
                    <Input
                      type="url"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/yourname"
                    />
                  </div>

                  {/* Facebook */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span>Facebook</span>
                    </Label>
                    <Input
                      type="url"
                      value={facebookUrl}
                      onChange={(e) => setFacebookUrl(e.target.value)}
                      placeholder="https://facebook.com/yourname"
                    />
                  </div>

                  {/* YouTube */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-600" />
                      <span>YouTube</span>
                    </Label>
                    <Input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/@channel"
                    />
                  </div>

                  {/* TikTok */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-foreground" />
                      <span>TikTok</span>
                    </Label>
                    <Input
                      type="url"
                      value={tiktokUrl}
                      onChange={(e) => setTiktokUrl(e.target.value)}
                      placeholder="https://tiktok.com/@username"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
