import { NavbarLeft } from "@/components/navbar-left";
import { EnvVarWarning } from "@/components/env-var-warning";
import { NavbarRight } from "@/components/navbar-right";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center w-full">
      <div className="flex-1 w-full flex flex-col items-center gap-10">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 bg-white">
          <div className="w-full max-w-7xl flex justify-between items-center p-2 sm:p-3 sm:px-5 text-sm">
            <div className="flex gap-2 sm:gap-5 items-center font-semibold">
              <Suspense
                fallback={
                  <div className="w-10 h-10 animate-pulse bg-gray-200 rounded-xl"></div>
                }
              >
                <NavbarLeft />
              </Suspense>
            </div>

            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense
                fallback={
                  <div className="w-20 h-8 animate-pulse bg-gray-200 rounded-md"></div>
                }
              >
                <NavbarRight />
              </Suspense>
            )}
          </div>
        </nav>
        <div className="w-full px-10">{children}</div>
      </div>
    </main>
  );
}
