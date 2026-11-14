import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/";
  const isNative = searchParams.get("native") === "1";

  // หากเป็นการเรียกมาจาก Mobile Native (Capacitor)
  // ให้ Redirect ส่ง code กลับเข้า App Scheme ทันที เพื่อให้ Client ในแอปเป็นผู้ทำ exchangeCodeForSession เอง
  if (isNative && code) {
    return NextResponse.redirect(
      `com.puanj.notes://auth/callback?code=${code}&next=${encodeURIComponent(next)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    } else {
      console.error("OAuth code exchange error:", error.message);

      // หากพบว่าเกิดจาก PKCE code verifier not found (กรณีเริ่มจาก Mobile/WebView แต่ Redirect เข้ามาใน Browser)
      // ให้ Fallback ส่งกลับเข้า App ผ่าน Deep Link เพื่อให้ App ลอง exchange อีกครั้ง
      if (
        error.message.includes("PKCE") ||
        error.message.includes("code verifier")
      ) {
        return NextResponse.redirect(
          `com.puanj.notes://auth/callback?code=${code}&next=${encodeURIComponent(next)}`
        );
      }

      return NextResponse.redirect(
        `${origin}/auth/error?error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}/auth/error?error=No+code+provided`);
}
