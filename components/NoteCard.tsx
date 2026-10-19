"use client";

import { useState } from "react";
import Image from "next/image";
import NoteTypeModal from "./NoteTypeModal";

export default function NoteCard() {
  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpenModal(true)}
        className="group relative flex w-full max-w-sm flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl border border-border bg-white p-10 shadow-sm"
      >
        <Image
          src="/note.webp"
          alt="บันทึก"
          width={100}
          height={150}
          unoptimized
        />

        <div className="relative z-10 flex flex-col items-center gap-1">
          <span className="text-xl font-bold text-foreground group-hover:text-primary">
            Note บันทึกข้อมูล
          </span>

          <span className="text-sm font-medium text-muted-foreground group-hover:text-primary/70">
            คลิกเพื่อดูและจัดการโน้ตของคุณ
          </span>
        </div>
      </button>

      <NoteTypeModal
        open={openModal}
        onClose={() => setOpenModal(false)}
      />
    </>
  );
}