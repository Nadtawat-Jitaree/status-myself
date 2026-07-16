"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export function NavbarLeft() {
  const [openModalNavbar, setOpenModalNavbar] = useState(false);

  return (
    <>
      <Link href={"/"} className="mr-4">
        <Image src="/all.webp" alt="home" width={40} height={40} />
      </Link>
      <button
        onClick={() => setOpenModalNavbar(true)}
        className="mr-4 justify-center items-center"
      >
        <Image src="/note.webp" alt="บันทึก" width={30} height={30} />
        {/* Notes */}
      </button>
      {openModalNavbar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl p-7 animate-in zoom-in-95 duration-200 mx-5">
            <button
              onClick={() => setOpenModalNavbar(false)}
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
                onClick={() => setOpenModalNavbar(false)}
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
                onClick={() => setOpenModalNavbar(false)}
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
              onClick={() => setOpenModalNavbar(false)}
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
