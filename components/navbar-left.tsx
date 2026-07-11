"use client";

import { useState } from "react";
import Link from "next/link";

export function NavbarLeft() {
  const [openModalNavbar, setOpenModalNavbar] = useState(false);

  return (
    <>
      <Link href={"/"} className="mr-4">
        Home
      </Link>
      <button onClick={() => setOpenModalNavbar(true)} className="mr-4">
        Notes
      </button>
      {openModalNavbar && (
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
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-black">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="size-6 text-white group-hover:text-white"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.75 1A1.75 1.75 0 0 0 2 2.75v10.5C2 14.216 2.784 15 3.75 15h8.5A1.75 1.75 0 0 0 14 13.25V5.56a1.75 1.75 0 0 0-.513-1.237L10.677 1.51A1.75 1.75 0 0 0 9.44 1H3.75Zm5 1.5v2.75c0 .414.336.75.75.75H12.25L8.75 2.5ZM5 7.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 7.25Zm0 2.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 9.75Zm0 2.5a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 5 12.25Z"
                    clipRule="evenodd"
                  />
                </svg>
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
                <div className="rounded-xl bg-gray-100 p-3 group-hover:bg-black transition">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="size-5 text-black group-hover:text-white"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3.75 1A1.75 1.75 0 0 0 2 2.75v10.5C2 14.216 2.784 15 3.75 15h8.5A1.75 1.75 0 0 0 14 13.25V5.56a1.75 1.75 0 0 0-.513-1.237L10.677 1.51A1.75 1.75 0 0 0 9.44 1H3.75Zm5 1.5v2.75c0 .414.336.75.75.75H12.25L8.75 2.5ZM5 7.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 7.25Zm0 2.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 9.75Zm0 2.5a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 5 12.25Z"
                      clipRule="evenodd"
                    />
                  </svg>
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
                <div className="rounded-xl bg-gray-100 p-3 group-hover:bg-black transition">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="size-5 text-black group-hover:text-white"
                  >
                    <path d="M7.5 1.049a1 1 0 0 1 1 0l6.25 3.5a.5.5 0 0 1 0 .902l-6.25 3.5a1 1 0 0 1-1 0L1.25 5.45a.5.5 0 0 1 0-.902l6.25-3.5Z" />
                    <path d="M3.5 7.338v2.69c0 .58.316 1.115.825 1.397C5.19 11.92 6.515 12.5 8 12.5s2.81-.58 3.675-1.075a1.6 1.6 0 0 0 .825-1.398v-2.69L8.743 9.442a1.5 1.5 0 0 1-1.486 0L3.5 7.338Z" />
                    <path d="M14 6.245v3.255a.75.75 0 0 1-1.5 0V7.084L14 6.245Z" />
                  </svg>
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
