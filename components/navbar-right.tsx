import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { getCurrentUserProfile } from "@/app/actions/profile";
import { AvatarDisplay } from "./AvatarDisplay";
import { getSubscriptionInfo } from "@/lib/subscription";
import { RoleBadge } from "./RoleBadge";

export async function NavbarRight() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const profile = user ? await getCurrentUserProfile() : null;
  const subscription = user ? await getSubscriptionInfo() : null;

  return user ? (
    /* Mobile: w-full + justify-between → badge+ชื่อซ้าย / logout ขวา
       Desktop (md+): w-auto + gap → เรียงเป็นแถวปกติ */
    <div className="flex items-center justify-between w-full md:w-auto md:justify-normal gap-2 md:gap-2">

      {/* ── ซ้าย: Role Badge + Profile ── */}
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Role Badge */}
        {subscription && <RoleBadge subscription={subscription} />}

        {/* Divider (desktop เท่านั้น) */}
        <div className="hidden md:block h-5 w-px bg-slate-200/80 mx-0.5" />

        {/* Profile link */}
        <Link
          href="/system/profile"
          className="group flex items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2.5 transition-all duration-150 hover:border-slate-200 hover:bg-slate-100 active:scale-95 min-w-0"
          title="จัดการโปรไฟล์"
        >
          <AvatarDisplay
            avatarType={profile?.avatar_type}
            avatarIcon={profile?.avatar_icon}
            avatarUrl={profile?.avatar_url}
            name={profile?.display_name || profile?.username}
            size="xs"
          />
          {/* ชื่อแสดงเสมอทุก breakpoint */}
          <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 max-w-[110px] truncate leading-none">
            {profile?.display_name || profile?.username || "โปรไฟล์"}
          </span>
        </Link>
      </div>

      {/* ── ขวา: Logout ── */}
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login" className="flex items-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 16 16" 
            fill="currentColor" 
            className="w-4 h-4 mr-1.5"
          >
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
          </svg>
          Sign in
        </Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up" className="flex items-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 16 16" 
            fill="currentColor" 
            className="w-4 h-4 mr-1.5"
          >
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
          </svg>
          Sign up
        </Link>
      </Button>
    </div>
  );
}