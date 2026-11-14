import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 ปี: ป้องกันไม่ให้ Android WebView ลบ Session เมื่อถูกปิด/ปัดแอปทิ้ง
      },
    }
  );
}
