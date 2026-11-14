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
    let cleanupUrlOpen: (() => void) | undefined;

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
          // ignore
        }

        // ซ่อน Splash Screen เมื่อ Next.js โหลดเสร็จ
        try {
          await SplashScreen.hide();
        } catch {
          // ignore
        }

        // Initialize Native Google Auth ถ้ามี Client ID
        try {
          const { initGoogleAuth } = await import('@/lib/capacitor/google-auth');
          await initGoogleAuth();
        } catch {
          // ignore
        }

        // เมื่อเปิดแอปบน Native เข้ามาหน้าแรก (/) ให้นำทางไปหน้า Dashboard โดยตรง
        if (pathname === '/') {
          router.replace('/system/dashboard');
        }

        // 1. จัดการ Android Hardware Back Button
        const backListener = await App.addListener('backButton', ({ canGoBack }) => {
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

        // 2. จัดการ Deep Link สำหรับ OAuth Callback (Google Login)
        const urlListener = await App.addListener('appUrlOpen', async (event) => {
          console.log('[Capacitor] App opened via Deep Link:', event.url);

          // ปิด In-App Browser ทันทีเมื่อ deep link กลับมาที่แอป
          try {
            const { Browser } = await import('@capacitor/browser');
            await Browser.close().catch(() => {});
          } catch {
            // ignore
          }

          if (
            event.url.includes('auth/callback') ||
            event.url.includes('code=') ||
            event.url.includes('access_token=')
          ) {
            try {
              const { createClient } = await import('@/lib/supabase/client');
              const supabase = createClient();

              // กรณีที่ 1: Token ส่งมาใน Hash fragment (#access_token=...)
              if (event.url.includes('#')) {
                const hash = event.url.split('#')[1];
                const hashParams = new URLSearchParams(hash);
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');

                if (accessToken && refreshToken) {
                  const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  });
                  if (!error) {
                    window.location.href = '/system/dashboard';
                    return;
                  }
                }
              }

              // กรณีที่ 2: Code ส่งมาใน Query params (?code=...)
              const urlObj = new URL(event.url);
              const code = urlObj.searchParams.get('code');
              const next = urlObj.searchParams.get('next') || '/system/dashboard';

              if (code) {
                // ทำ Code Exchange บน Client ที่มี PKCE Code Verifier อยู่ใน storage
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                  console.error('[Capacitor] Auth exchange error on client:', error.message);
                  window.location.href = `/auth/error?error=${encodeURIComponent(error.message)}`;
                } else {
                  // สำเร็จ! Redirect เข้าหน้า Dashboard
                  window.location.href = next;
                }
              }
            } catch (err) {
              console.error('[Capacitor] Failed processing OAuth deep link:', err);
            }
          }
        });
        cleanupUrlOpen = () => {
          urlListener.remove();
        };

      } catch (err) {
        console.warn('[Capacitor] Initialization warning:', err);
      }
    };

    setupNative();

    return () => {
      if (cleanupBackButton) cleanupBackButton();
      if (cleanupUrlOpen) cleanupUrlOpen();
    };
  }, [router, pathname]);

  return null;
}
