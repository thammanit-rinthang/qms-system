"use client";

import Link from "next/link";

interface Props {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  /** "approved" = checkmark green, "rejected" = X rose, default = checkmark */
  variant?: "approved" | "rejected";
}

export default function ApproveSuccessScreen({
  title,
  subtitle,
  backHref = "/approve",
  backLabel = "กลับหน้าหลัก",
  variant = "approved",
}: Props) {
  const isApproved = variant !== "rejected";

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="flex flex-col items-center text-center max-w-sm w-full">
        {/* Icon */}
        <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-full ${isApproved ? "bg-emerald-50" : "bg-rose-50"}`}>
          {isApproved ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </div>

        {/* Text */}
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}

        {/* Back button */}
        <Link
          href={backHref}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
