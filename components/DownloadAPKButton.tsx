"use client";

import { isNativePlatform } from "@/lib/capacitor/platform";

export default function DownloadAPKButton() {
  // หากเปิดจากภายในแอป Android อยู่แล้ว ไม่ต้องแสดงปุ่มดาวน์โหลด APK
  if (isNativePlatform()) {
    return null;
  }

  return (
    <a
      href="/nj-notes-v3.0.apk"
      download="NJ-Notes-v3.0.apk"
      className="
        lg:hidden
        group
        relative
        inline-flex items-center justify-center gap-2
        text-sm font-medium
        px-5 py-3
        rounded-md
        border border-black/15
        bg-white hover:bg-black/[0.04]
        text-black
        transition-all duration-200
        active:scale-[0.98]
        shadow-sm
      "
    >
      {/* Android Robot Icon */}
      <svg
        className="w-4 h-4 fill-emerald-600 group-hover:scale-110 transition-transform duration-200"
        viewBox="0 0 24 24"
      >
        <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.125 12 8.125c-1.8533 0-3.5902.2866-5.1368.8247L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.75h24c-.3432-4.0911-2.6889-7.5633-6.1185-9.4286" />
      </svg>

      <span>ดาวน์โหลด APK</span>
      <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
        v3.0
      </span>
    </a>
  );
}
