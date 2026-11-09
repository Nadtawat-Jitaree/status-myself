"use client";

import React, { useState } from "react";
import { QualityIconRenderer } from "@/lib/lucide-icons";
import { getPresetByName } from "@/lib/avatar-presets";
import { cn } from "@/lib/utils";

export interface AvatarDisplayProps {
  avatarType?: "icon" | "upload" | string | null;
  avatarIcon?: string | null;
  avatarUrl?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  onClick?: () => void;
  showBorder?: boolean;
}

const sizeClasses = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
  "2xl": "w-24 h-24 text-3xl",
};

const iconSizes = {
  xs: "w-3.5 h-3.5",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
  "2xl": "w-12 h-12",
};

export function AvatarDisplay({
  avatarType = "icon",
  avatarIcon = "User",
  avatarUrl,
  name,
  size = "md",
  className,
  onClick,
  showBorder = true,
}: AvatarDisplayProps) {
  const [imgError, setImgError] = useState(false);
  const preset = getPresetByName(avatarIcon || "User");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const resolvedUrl =
    avatarUrl && !avatarUrl.startsWith("http") && !avatarUrl.startsWith("blob:")
      ? `${supabaseUrl}/storage/v1/object/public/avatars/${avatarUrl}`
      : avatarUrl;

  const baseSize = sizeClasses[size];
  const iconSize = iconSizes[size];

  // กรณีเป็นรูปภาพที่อัปโหลดและไม่มี error
  if (avatarType === "upload" && resolvedUrl && !imgError) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "relative rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-slate-100",
          baseSize,
          showBorder && "ring-2 ring-white/80",
          onClick && "cursor-pointer hover:opacity-90 transition-opacity",
          className
        )}
      >
        <img
          src={resolvedUrl}
          alt={name || "User Avatar"}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // กรณีเป็น Icon Preset (หรือ fallback เมื่อโหลดรูปไม่สำเร็จ)
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br select-none",
        preset.bgGradient,
        baseSize,
        showBorder && "ring-2 ring-white/80",
        onClick && "cursor-pointer hover:opacity-90 transition-opacity",
        className
      )}
      title={name || preset.label}
    >
      <QualityIconRenderer
        iconName={avatarIcon || "User"}
        className={cn(iconSize, "text-white")}
      />
    </div>
  );
}
