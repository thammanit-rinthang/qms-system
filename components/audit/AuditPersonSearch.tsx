"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { INPUT_CLASS } from "@/lib/styles";
import { useReviewerCandidates, type ReviewerCandidate } from "@/hooks/api/use-reviewer-candidates";

export function AuditPersonSearch({
  placeholder,
  onSelect,
  exclude,
}: {
  placeholder: string;
  onSelect: (c: ReviewerCandidate) => void;
  exclude?: string[];
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data: candidates = [], isLoading } = useReviewerCandidates(q, q.length >= 1);
  const filtered = candidates.filter((c) => !exclude?.includes(c.id));

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className={cn(INPUT_CLASS, "pl-8")}
        />
      </div>
      {open && q.length >= 1 && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-slate-400">กำลังค้นหา...</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">ไม่พบผู้ใช้</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => { onSelect(c); setQ(""); setOpen(false); }}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-800">{c.name}</span>
                <span className="text-xs text-slate-400">{c.email ?? ""}{c.department ? ` • ${c.department}` : ""}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
