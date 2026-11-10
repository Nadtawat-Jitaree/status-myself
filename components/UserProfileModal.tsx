"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AvatarDisplay } from "./AvatarDisplay";
import { X, ExternalLink, Calendar, CheckCircle2 } from "lucide-react";

export interface UserProfileData {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_type?: string | null;
  avatar_icon?: string | null;
  avatar_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  created_at?: string | null;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileData | null;
}

// SVG Icons สำหรับ Social Medias ยอดนิยม
function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function YouTubeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function TikTokIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.97v7.9c-.01 2.22-.84 4.41-2.43 5.92-1.74 1.67-4.22 2.44-6.61 2.08-2.61-.38-4.9-2.09-5.98-4.49-1.25-2.73-.8-6.15 1.16-8.41 1.76-2.04 4.54-3 7.18-2.5v4.13c-1.39-.42-2.97-.13-4.04.83-1.07.95-1.48 2.5-1.07 3.87.41 1.36 1.74 2.37 3.18 2.43 1.57.06 3.08-.85 3.65-2.31.25-.62.33-1.31.33-1.99V.02z" />
    </svg>
  );
}

export function UserProfileModal({
  isOpen,
  onClose,
  user,
}: UserProfileModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || !user) return null;

  const displayName = user.display_name || user.username || "ผู้ใช้งาน";
  const hasSocials =
    Boolean(user.instagram_url) ||
    Boolean(user.facebook_url) ||
    Boolean(user.youtube_url) ||
    Boolean(user.tiktok_url);

  // Helper สำหรับจัด URL ให้มี https://
  const formatUrl = (url?: string | null) => {
    if (!url) return "#";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Header with Gradient */}
        <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-2 rounded-md bg-black/20 hover:bg-black/40 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="px-6 pb-6 pt-0 relative flex flex-col items-center text-center">
          {/* Avatar Overflowing */}
          <div className="-mt-12 mb-3 ring-4 ring-white rounded-full shadow-lg bg-white p-0.5">
            <AvatarDisplay
              avatarType={user.avatar_type}
              avatarIcon={user.avatar_icon}
              avatarUrl={user.avatar_url}
              name={displayName}
              size="2xl"
              showBorder={false}
            />
          </div>

          {/* User Name & Badge */}
          <div className="flex items-center gap-1.5">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              {displayName}
            </h3>
            <CheckCircle2 className="w-4 h-4 text-sky-500 fill-sky-50" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            @{user.username || "user"}
          </p>

          {user.created_at && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
              <Calendar className="w-3 h-3" />
              <span>
                สมาชิกตั้งแต่{" "}
                {new Date(user.created_at).toLocaleDateString("th-TH", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="w-full my-5 h-px bg-slate-100" />

          {/* Social Links Section */}
          <div className="w-full">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-left">
              ช่องทางการติดตาม (Social Media)
            </h4>

            {hasSocials ? (
              <div className="grid grid-cols-2 gap-2.5">
                {user.instagram_url && (
                  <a
                    href={formatUrl(user.instagram_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 hover:from-pink-500/20 hover:to-orange-500/20 border border-pink-200/50 text-pink-700 text-xs font-medium transition group"
                  >
                    <span className="flex items-center gap-2">
                      <InstagramIcon className="w-4 h-4 text-pink-600" />
                      <span>Instagram</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition" />
                  </a>
                )}

                {user.facebook_url && (
                  <a
                    href={formatUrl(user.facebook_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200/60 text-blue-700 text-xs font-medium transition group"
                  >
                    <span className="flex items-center gap-2">
                      <FacebookIcon className="w-4 h-4 text-blue-600" />
                      <span>Facebook</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition" />
                  </a>
                )}

                {user.youtube_url && (
                  <a
                    href={formatUrl(user.youtube_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-red-50/70 hover:bg-red-100/80 border border-red-200/60 text-red-700 text-xs font-medium transition group"
                  >
                    <span className="flex items-center gap-2">
                      <YouTubeIcon className="w-4 h-4 text-red-600" />
                      <span>YouTube</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition" />
                  </a>
                )}

                {user.tiktok_url && (
                  <a
                    href={formatUrl(user.tiktok_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-900/5 hover:bg-slate-900/10 border border-slate-200 text-slate-800 text-xs font-medium transition group"
                  >
                    <span className="flex items-center gap-2">
                      <TikTokIcon className="w-4 h-4 text-slate-900" />
                      <span>TikTok</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition" />
                  </a>
                )}
              </div>
            ) : (
              <div className="py-4 px-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-400">
                ผู้ใช้นี้ยังไม่ได้ระบุลิงก์โซเชียลมีเดีย
              </div>
            )}
          </div>

          {/* Action button */}
          <button
            onClick={onClose}
            className="w-full mt-6 py-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
