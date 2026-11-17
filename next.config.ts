import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  // ปิด aggressiveFrontEndNavCaching — ใน Android WebView จะ stall navigation
  // ใช้ cacheOnFrontEndNav: false เพื่อให้ network-first เสมอ
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  disable: false,
});
const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      encoding: false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*.apk",
        headers: [
          {
            key: "Content-Type",
            value: "application/vnd.android.package-archive",
          },
          {
            key: "Content-Disposition",
            value: 'attachment; filename="NJ-Notes-v3.0.apk"',
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
