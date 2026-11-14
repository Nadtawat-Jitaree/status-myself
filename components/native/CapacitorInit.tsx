'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isNativePlatform } from '@/lib/capacitor/platform';

export default function CapacitorInit() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isNativePlatform()) return;

    let cleanupBackButton: (() => void) | undefined;

    const setupNative = async () => {
      try {
        const { App } = await import('@capacitor/app');
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        const { SplashScreen } = await import('@capacitor/splash-screen');

        // ตั้งค่า Status Bar
        try {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setOverlaysWebView({ overlay: false });
        } catch {
          // StatusBar might not be available or throw in dev webview
        }

        // ซ่อน Splash Screen เมื่อ Next.js โหลดเสร็จ
        try {
          await SplashScreen.hide();
        } catch {
          // ignore
        }

        // จัดการ Android Hardware Back Button
        const backListener = await App.addListener('backButton', ({ canGoBack }) => {
          // หากอยู่ในหน้าหลักแล้ว (เช่น หน้าแรก หรือ dashboard) ให้ย่อ/ปิดแอป
          const isRootPage = pathname === '/' || pathname === '/system/dashboard';

          if (isRootPage || !canGoBack) {
            App.minimizeApp();
          } else {
            router.back();
          }
        });

        cleanupBackButton = () => {
          backListener.remove();
        };
      } catch (err) {
        console.warn('[Capacitor] Initialization warning:', err);
      }
    };

    setupNative();

    return () => {
      if (cleanupBackButton) {
        cleanupBackButton();
      }
    };
  }, [router, pathname]);

  return null;
}
