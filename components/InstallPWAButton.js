"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isReadyToInstall, setIsReadyToInstall] = useState(true);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsReadyToInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const clearPWADataAndReload = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }

      window.location.reload();
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการล้างข้อมูล PWA:", error);
      window.location.reload();
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      Swal.fire({
        icon: "warning",
        title: "ไม่สามารถติดตั้งได้",
        text: "ระบบอาจมองว่าแอปถูกติดตั้งอยู่ หรือค้างข้อมูลเดิม ต้องการล้างข้อมูลแอปและรีเฟรชหน้าเว็บใหม่หรือไม่? (สำหรับ iOS ให้ใช้เมนู Share -> Add to Home Screen)",
        showCancelButton: true,
        confirmButtonText: "ล้างข้อมูล & รีเฟรช",
        cancelButtonText: "ปิด",
        confirmButtonColor: "#ef4444",
      }).then((result) => {
        if (result.isConfirmed) {
          clearPWADataAndReload();
        }
      });
      return;
    }

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      Swal.fire({
        icon: "success",
        title: "ติดตั้งสำเร็จ!",
        showConfirmButton: false,
        timer: 1500,
      });
    }

    setDeferredPrompt(null);
  };

  if (!isReadyToInstall) return null;

  return (
    <Button
      onClick={handleInstallClick}
      className="
    group
    relative
    flex items-center justify-center gap-2
    text-sm
    bg-black
    text-white
    px-5 py-3
    rounded-md
    font-medium
    border border-black
    hover:bg-white
    hover:text-black
    active:translate-y-0
    active:scale-[0.98]
  "
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="w-4 h-4 transition-transform duration-300"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v12m0 0 4-4m-4 4-4-4"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 21h14" />
      </svg>

      <span>ติดตั้งแอปพลิเคชัน</span>
    </Button>
  );
}
