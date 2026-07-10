"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

export interface GraphGroupResult {
  id: string;
  displayName: string;
  mail: string | null;
  description: string | null;
}

interface Props {
  label: string;
  value: GraphGroupResult[];
  onChange: (groups: GraphGroupResult[]) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export default function GraphGroupPicker({ label, value, onChange, placeholder, required, error }: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  const { data, isLoading, isError } = useQuery<{ data: GraphGroupResult[] }>({
    queryKey: ["ms-graph-groups", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/ms-graph/groups/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error("Failed to search groups");
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const groups = data?.data ?? [];
  const selectedIds = new Set(value.map((g) => g.id));

  function toggle(group: GraphGroupResult) {
    if (selectedIds.has(group.id)) {
      onChange(value.filter((g) => g.id !== group.id));
    } else {
      onChange([...value, group]);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? "พิมพ์ชื่อกลุ่ม (ขั้นต่ำ 2 ตัวอักษร)..."}
        autoComplete="off"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="rounded-md border border-gray-200 max-h-52 overflow-y-auto divide-y divide-gray-100">
        {debouncedQuery.length < 2 ? (
          <p className="px-3 py-3 text-sm text-gray-400 text-center">พิมพ์เพื่อค้นหากลุ่ม</p>
        ) : isLoading ? (
          <p className="px-3 py-3 text-sm text-gray-400 text-center">กำลังค้นหา...</p>
        ) : isError ? (
          <p className="px-3 py-3 text-sm text-red-400 text-center">เกิดข้อผิดพลาด ลองใหม่อีกครั้ง</p>
        ) : groups.length === 0 ? (
          <p className="px-3 py-3 text-sm text-gray-400 text-center">ไม่พบกลุ่ม</p>
        ) : (
          groups.map((g) => (
            <div
              key={g.id}
              onClick={() => toggle(g)}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-green-50 transition-colors select-none"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(g.id)}
                onChange={() => {}}
                className="h-4 w-4 rounded border-gray-300 accent-primary shrink-0 pointer-events-none"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{g.displayName}</p>
                {g.mail && <p className="text-xs text-gray-500 font-mono truncate">{g.mail}</p>}
              </div>
            </div>
          ))
        )}
      </div>

      {value.length > 0 && (
        <p className="text-xs text-green-700">เลือกแล้ว {value.length} กลุ่ม</p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
