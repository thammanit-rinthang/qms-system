"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-5">
          <span className="text-rose-600 text-2xl font-bold">!</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#0F1059] mb-2">
          เกิดข้อผิดพลาด
        </h1>
        <p className="text-sm text-slate-400 mb-1">Something went wrong</p>
        <p className="text-sm text-slate-500 mb-8">
          กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบ
        </p>

        {error.digest && (
          <p className="text-xs font-mono text-slate-300 mb-6">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="h-11 min-w-[44px] bg-[#0F1059] text-white rounded-xl px-6 py-2 text-sm font-medium hover:bg-[#161875] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2"
          >
            ลองอีกครั้ง / Retry
          </button>
          <Link
            href="/"
            className="h-11 min-w-[44px] inline-flex items-center justify-center bg-white text-slate-700 border border-slate-200 rounded-xl px-6 py-2 text-sm font-medium hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2"
          >
            กลับหน้าหลัก / Home
          </Link>
        </div>
      </div>
    </div>
  );
}
