"use client";

import { useState, useRef, useEffect } from "react";

export interface GraphUserResult {
  id: string;
  name: string;
  email: string;
  employeeId: string | null;
  department: string | null;
  jobTitle: string | null;
}

interface Props {
  label: string;
  value: GraphUserResult | null;
  onChange: (user: GraphUserResult | null) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export default function GraphUserPicker({ label, value, onChange, placeholder, required, error }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<GraphUserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // close on click outside — no blur/focus tricks needed
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function search(q: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ms-graph/users/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setResults(json.data ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleFocus() {
    setOpen(true);
    search(query);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    search(e.target.value);
  }

  function select(user: GraphUserResult) {
    onChange(user);
    setQuery("");
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setQuery("");
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {value ? (
        <div className="flex items-center gap-2.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0F1059] text-white text-xs font-bold">
            {(value.name?.[0] ?? "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{value.name}</p>
            <p className="text-xs text-gray-500 truncate">
              {value.jobTitle ? `${value.jobTitle} · ` : ""}
              {value.employeeId ? `#${value.employeeId} · ` : ""}
              {value.email}
            </p>
          </div>
          <button type="button" onClick={clear} className="shrink-0 text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
      ) : (
        <div ref={wrapperRef} className="relative">
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={handleFocus}
            placeholder={placeholder ?? "ค้นหาชื่อ หรืออีเมล..."}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
          />
          {loading && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">...</span>
          )}

          {open && (
            <div className="absolute top-full left-0 right-0 z-[200] mt-1 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
              {results.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-gray-400 text-center">
                  {loading ? "กำลังค้นหา..." : query ? "ไม่พบผู้ใช้" : "พิมพ์เพื่อค้นหา"}
                </p>
              ) : (
                <ul className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                  {results.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => select(u)}
                        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xs font-bold mt-0.5">
                          {(u.name?.[0] ?? "?").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {u.jobTitle ? `${u.jobTitle} · ` : ""}
                            {u.department ? `${u.department} · ` : ""}
                            {u.email}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
