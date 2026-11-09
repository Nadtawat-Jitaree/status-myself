"use client";

import { useEffect } from "react";

/**
 * ล้าง query parameter `?session_id=...` ออกจาก URL Bar หลังจากโหลดหน้าสำเร็จ
 * เพื่อป้องกันเวลาที่ผู้ใช้กด F5 หรือ Refresh ซ้ำๆ ไม่ให้ส่ง session_id เดิมเข้ามา
 */
export function CleanSessionUrl() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("session_id")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  return null;
}
