"use client";

import Link from "next/link";

interface Props {
  action?: "approved" | "rejected" | "done";
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  badge?: React.ReactNode;
}

export default function ApproveSuccessCard({ action = "done", title, description, backHref, backLabel = "กลับหน้าหลัก", badge }: Props) {
  const isRejected = action === "rejected";

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            isRejected ? "bg-rose-100" : "bg-emerald-100"
          }`}>
            {isRejected ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-slate-800 mb-1">{title}</h2>

        {/* Description */}
        {description && (
          <p className="text-sm text-slate-500 mb-4">{description}</p>
        )}

        {/* Badge */}
        {badge && <div className="flex justify-center mb-5">{badge}</div>}

        {/* Back button */}
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
