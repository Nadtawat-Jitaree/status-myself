import { Suspense } from "react";
import { NavbarLeft } from "@/components/navbar-left";
import { NavbarRight } from "@/components/navbar-right";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasEnvVars } from "@/lib/utils";

interface NavbarProps {
  maxWidth?: string;
  className?: string;
}

export function Navbar({
  maxWidth = "max-w-7xl",
  className = "",
}: NavbarProps) {
  return (
    <nav
      className={`w-full border-b border-slate-200/70 bg-white/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm ${className}`}
    >
      <div className={`mx-auto ${maxWidth} text-sm`}>
        {/* ── แถวหลัก: Logo + Nav (ทุก breakpoint) ── */}
        <div className="flex items-center justify-between px-3 sm:px-5 h-14">
          {/* ซ้าย/หลัก: Logo + เมนูนำทาง (บน mobile ขยายเต็ม w-full) */}
          <div className="flex items-center gap-2 font-semibold min-w-0 w-full md:w-auto">
            <Suspense
              fallback={
                <div className="w-full md:w-32 h-9 animate-pulse bg-slate-100 rounded-2xl" />
              }
            >
              <NavbarLeft />
            </Suspense>
          </div>

          {/* ขวา: User section — แสดงเฉพาะ Desktop (md+) */}
          <div className="hidden md:flex items-center">
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense
                fallback={
                  <div className="w-28 h-8 animate-pulse bg-slate-100 rounded-full" />
                }
              >
                <NavbarRight />
              </Suspense>
            )}
          </div>
        </div>

        {/* ── แถวที่ 2: User section — Mobile เท่านั้น ── */}
        <div className="md:hidden border-t border-slate-100">
          <div className="flex items-center px-3 sm:px-5 py-2 bg-gradient-to-r from-slate-50 to-white">
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense
                fallback={
                  <div className="w-full h-9 animate-pulse bg-slate-100 rounded-full" />
                }
              >
                <NavbarRight />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
