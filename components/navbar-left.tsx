"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
      <Link href="/system/dashboard" className="mr-4">
        <Image
          src="/dashboard.png"
          alt="home"
          width={40}
          loading="eager"
          height={40}
          unoptimized
        />
      </Link>

      <button
        onClick={() => setOpenModalNavbar(true)}
        className="mr-4 flex items-center justify-center"
      >
        <Image
          src="/menus.png"
          alt="menus"
          width={40}
          height={40}
          unoptimized
        />
      </button>

      <NoteTypeModal
        open={openModalNavbar}
        onClose={() => setOpenModalNavbar(false)}
      />
    </>
  );
}