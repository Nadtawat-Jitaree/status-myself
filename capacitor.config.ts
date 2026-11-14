import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.puanj.notes',
  appName: 'NJ Notes',
  webDir: 'public',
  server: {
    // กำหนดให้หน้าเริ่มต้นของแอปเปิดเข้า Dashboard โดยตรง
    url: process.env.CAPACITOR_SERVER_URL || 'https://notes.puanj.com/system/dashboard',
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
