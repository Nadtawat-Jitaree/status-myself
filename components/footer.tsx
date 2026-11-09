import Link from "next/link";
import Image from "next/image";

interface FooterProps {
  variant?: "default" | "system" | "compact";
  className?: string;
}

export function Footer({ variant = "default", className = "" }: FooterProps) {
  const currentYear = 2026;

  if (variant === "compact") {
    return (
      <footer
        className={`w-full border-t border-slate-200 bg-white py-5 px-4 ${className}`}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-md bg-slate-50 p-0.5 border border-slate-200">
              <Image
                src="/logo.png"
                alt="NJ Notes"
                width={20}
                height={20}
                className="object-contain"
              />
            </div>
            <span className="font-semibold text-slate-800 tracking-tight">NJ Notes</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">จดบันทึก จัดระเบียบความคิด</span>
          </div>

          <div className="text-xs text-slate-400">
            © {currentYear} NJ Notes by PUANJ
          </div>
        </div>
      </footer>
    );
  }

  // Full & System Variants
  const isSystem = variant === "system";

  return (
    <footer
      className={`w-full border-t border-slate-200 bg-white mt-auto ${className}`}
    >
      <div
        className={`mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 ${
          isSystem ? "max-w-7xl" : "max-w-6xl"
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-8 border-b border-slate-100">
          {/* Brand Info */}
          <div className="md:col-span-6 flex flex-col items-start gap-3">
            <Link
              href="/"
              className="group flex items-center gap-2.5 hover:opacity-85 transition-opacity"
            >
              <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-slate-50 p-1 border border-slate-200 shadow-xs">
                <Image
                  src="/logo.png"
                  alt="NJ Notes"
                  width={30}
                  height={30}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-slate-800 leading-tight">
                  NJ Notes
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  by PUANJ
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mt-1">
              แอปพลิเคชันจดบันทึกและบริหารจัดการความคิดที่เรียบง่าย ทรงพลัง
              ออกแบบมาเพื่อเพิ่มโฟกัสและประสิทธิภาพในการทำงานของคุณ
            </p>

            <div className="text-[11px] text-slate-400 mt-1">
              Version 2.0
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-6 grid grid-cols-2 gap-6 sm:gap-8">
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                เมนูหลัก
              </h4>
              <ul className="flex flex-col gap-2 text-xs sm:text-sm text-slate-500">
                <li>
                  <Link href="/system/notes" className="hover:text-slate-900 transition-colors">
                    บันทึกทั้งหมด
                  </Link>
                </li>
                <li>
                  <Link href="/system/projects" className="hover:text-slate-900 transition-colors">
                    โปรเจกต์
                  </Link>
                </li>
                <li>
                  <Link href="/system/calendar" className="hover:text-slate-900 transition-colors">
                    ปฏิทินงาน
                  </Link>
                </li>
                <li>
                  <Link href="/system/dashboard" className="hover:text-slate-900 transition-colors">
                    สถิติ & แดชบอร์ด
                  </Link>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                คอมมูนิตี้
              </h4>
              <ul className="flex flex-col gap-2 text-xs sm:text-sm text-slate-500">
                <li>
                  <Link href="/board" className="hover:text-slate-900 transition-colors">
                    กระดานสนทนา
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-slate-900 transition-colors">
                    หน้าแรก
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {currentYear} NJ Notes by PUANJ. All rights reserved.
          </p>

          <span className="hidden sm:inline text-slate-400">
            Simple notes. Clear thoughts.
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
