'use client';

import { SocialLogin } from '@capgo/capacitor-social-login';
import { createClient } from '@/lib/supabase/client';

let isInitialized = false;

export async function initGoogleAuth() {
  if (isInitialized) return;
  const webClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (!webClientId) {
    console.warn(
      '[SocialLogin] NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set. Native Google Auth requires Google Web Client ID.'
    );
    return;
  }

  try {
    // ต้องใช้ mode: 'online' เพื่อให้ Google คืนค่า idToken (JWT) ออกมา
    // หากใช้ 'offline' Google จะคืนมาแค่ serverAuthCode ทำให้ไม่มี idToken
    await SocialLogin.initialize({
      google: {
        webClientId,
        mode: 'online',
      },
    });
    isInitialized = true;
    console.log('[SocialLogin] Initialized Google Auth with Web Client ID');
  } catch (err) {
    console.error('[SocialLogin] Failed to initialize Google Auth:', err);
  }
}

export async function nativeGoogleLogin() {
  const webClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new Error(
      'กรุณาระบุ NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ใน .env ก่อนใช้งาน Google Login แบบ Native'
    );
  }

  await initGoogleAuth();

  const res = await SocialLogin.login({
    provider: 'google',
    options: {
      scopes: ['email', 'profile'],
    },
  });

  console.log('[SocialLogin] Google Login Response:', res);

  const result = res.result as {
    idToken?: string | null;
    accessToken?: { token?: string } | null;
    serverAuthCode?: string;
  };

  const idToken = result?.idToken;

  if (!idToken) {
    console.error('[SocialLogin] Result missing idToken:', res);
    throw new Error(
      `ไม่ได้รับ ID Token จาก Google: ${JSON.stringify(res.result || {})}`
    );
  }

  // ส่ง idToken ไปแลก Session กับ Supabase โดยตรงในแอป
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) {
    console.error('[SocialLogin] Supabase signInWithIdToken error:', error.message);
    throw error;
  }

  return data;
}
