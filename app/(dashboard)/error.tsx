"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useT } from "@/lib/i18n";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  useEffect(() => {
    console.error(error);
    const isUnauthorized =
      error.digest === "UNAUTHORIZED" ||
      error.digest === "SESSION_EXPIRED" ||
      error.message?.includes("UNAUTHORIZED") ||
      error.message?.includes("Unauthorized") ||
      error.message?.includes("unauthorized") ||
      error.message?.includes("401");

    if (isUnauthorized) {
      const currentPath = window.location.pathname + window.location.search;
      const callbackUrl = `/auth/login?callbackUrl=${encodeURIComponent(currentPath)}`;
      window.location.href = `/api/auth/signout?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4">
        <span className="text-rose-600 text-xl font-bold">!</span>
      </div>

      <p className="text-slate-800 font-semibold text-base mb-1">
        {t("error.title")}
      </p>

      <p className="text-slate-400 text-sm mb-6">
        {t("error.desc")}
      </p>

      {error.digest && (
        <p className="text-xs font-mono text-slate-300 mb-5">
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="h-11 min-w-[44px] bg-[#0F1059] text-white rounded-xl px-6 py-2 text-sm font-medium hover:bg-[#161875] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2"
        >
          {t("error.retryBtn")}
        </button>
        <Link
          href="/"
          className="h-11 min-w-[44px] inline-flex items-center justify-center bg-white text-slate-700 border border-slate-200 rounded-xl px-6 py-2 text-sm font-medium hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2"
        >
          {t("error.goHome")}
        </Link>
      </div>
    </div>
  );
}
