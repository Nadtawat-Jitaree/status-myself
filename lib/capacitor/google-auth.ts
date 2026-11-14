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
    await SocialLogin.initialize({
      google: {
        webClientId,
        mode: 'offline',
      },
    });
    isInitialized = true;
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

  // ใน result ของ SocialLogin จะมี idToken จาก Google Play Services
  const result = res.result as { idToken?: string } | undefined;
  const idToken = result?.idToken;

  if (!idToken) {
    throw new Error('ไม่ได้รับ ID Token จาก Google');
  }

  // แลก session โดยตรงกับ Supabase ภายในแอป ไม่ต้องผ่าน Browser ใดๆ
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) throw error;
  return data;
}
