import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.puanj.notes',
  appName: 'NJ Notes',
  webDir: 'public',
  server: {
    // โหลด Production URL โดยตรง เพื่อให้ Server Actions และ Supabase SSR ทำงานได้สมบูรณ์
    // สามารถ Override ได้ด้วย env CAPACITOR_SERVER_URL สำหรับ dev/staging
    url: process.env.CAPACITOR_SERVER_URL || 'https://notes.puanj.com',
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#09090b',
      androidSplashResourceName: 'splash',
      showSpinner: false
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK'
    }
  }
};

export default config;
