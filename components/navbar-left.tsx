"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, BarChart3, LayoutGrid, Award } from "lucide-react";
import NoteTypeModal from "./NoteTypeModal";

export function NavbarLeft() {
  const [openModalNavbar, setOpenModalNavbar] = useState(false);

  return (
    <>
      <Link href="/" className="mr-4">
        <Image
          src="/logo.png"
          alt="home"
          width={50}
          height={50}
        />
      </Link>
      <Link
        href="/system/dashboard"
        className="mr-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
        title="แดชบอร์ด"
      >
        <BarChart3 className="h-5 w-5" />
      </Link>
      <Link
        href="/system/qualities"
        className="mr-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20"
        title="คุณสมบัติ & แต้มสะสม"
      >
        <Award className="h-5 w-5" />
      </Link>
      <Link
        href="/system/calendar"
        className="mr-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
        title="ปฏิทิน & บันทึกรายวัน"
      >
        <CalendarDays className="h-5 w-5" />
      </Link>

      <button
        type="button"
        onClick={() => setOpenModalNavbar(true)}
        className="mr-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 hover:bg-purple-500/20"
        title="เมนู"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>

      <NoteTypeModal
        open={openModalNavbar}
        onClose={() => setOpenModalNavbar(false)}
      />
    </>
  );
}