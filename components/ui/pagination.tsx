"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
}

export default function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  const btnBase =
    "inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-xl text-sm font-medium transition-all select-none";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Prev */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          btnBase,
          "text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed",
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`ellipsis-${idx}`} className={cn(btnBase, "text-slate-400 cursor-default")}>
            ···
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={cn(
              btnBase,
              p === currentPage
                ? "bg-[#0F1059] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-800",
            )}
            aria-current={p === currentPage ? "page" : undefined}
          >
            {p}
          </button>
        ),
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          btnBase,
          "text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed",
        )}
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
