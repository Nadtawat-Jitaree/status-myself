"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function NoteCard() {
  const [openModal, setOpenModal] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpenModal(true)}
        className="group relative flex flex-col items-center justify-center gap-5 p-10 w-full max-w-sm rounded-3xl border border-border bg-white shadow-sm overflow-hidden cursor-pointer"
      >
        <div className="absolute" />

        <Image src="/note.webp" alt="บันทึก" width={100} height={150} />

        <div className="flex flex-col items-center gap-1 relative z-10">
          <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
            Note บันทึกข้อมูล
          </span>
          <span className="text-sm font-medium text-muted-foreground group-hover:text-primary/70 transition-colors duration-300">
            คลิกเพื่อดูและจัดการโน้ตของคุณ
          </span>
        </div>
      </button>
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl p-7 animate-in zoom-in-95 duration-200 mx-5">
            <button
              onClick={() => setOpenModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 hover:bg-gray-100 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-4 text-gray-500"
              >
                <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>

            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
                <Image
                  src="/note.webp"
                  alt="มหาลัย"
                  width={40}
                  height={100}
                ></Image>
              </div>

              <h2 className="text-2xl font-bold">เลือกประเภทโน้ต</h2>

              <p className="mt-2 text-sm text-gray-500">
                เลือกหมวดหมู่ที่ต้องการเข้าใช้งาน
              </p>
            </div>

            <div className="space-y-4">
              <Link
                href="/system/notes/normal"
                onClick={() => setOpenModal(false)}
                className="group flex items-center gap-4 rounded-2xl border border-gray-200 p-5 hover:border-black hover:bg-gray-50 transition"
              >
                <div className="rounded-xl bg-gray-100 p-3 transition">
                  <Image
                    src="/normal.webp"
                    alt="โน๊ตทั่วไป"
                    width={30}
                    height={100}
                  ></Image>
                </div>

                <div className="flex-1">
                  <div className="font-semibold text-gray-800">โน้ตทั่วไป</div>

                  <div className="text-sm text-gray-500"></div>
                </div>
              </Link>

              <Link
                href="/system/notes/school"
                onClick={() => setOpenModal(false)}
                className="group flex items-center gap-4 rounded-2xl border border-gray-200 p-5 hover:border-black hover:bg-gray-50 transition"
              >
                <div className="rounded-xl bg-gray-100 p-3 transition">
                  <Image
                    src="/school.webp"
                    alt="มหาลัย"
                    width={30}
                    height={100}
                  ></Image>
                </div>

                <div className="flex-1">
                  <div className="font-semibold text-gray-800">
                    โน๊ตมหาวิทยาลัย
                  </div>

                  <div className="text-sm text-gray-500"></div>
                </div>
              </Link>
            </div>

            <button
              onClick={() => setOpenModal(false)}
              className="mt-7 w-full rounded-xl border py-3 text-sm font-medium hover:bg-gray-50 transition"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </>
  );
}
