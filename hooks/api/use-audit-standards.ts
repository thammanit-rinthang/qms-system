"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AuditStandard {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

const KEYS = { all: ["audit-standards"] as const };

async function fetchStandards(): Promise<AuditStandard[]> {
  const r = await fetch("/api/audit/standards");
  if (!r.ok) throw new Error("Failed");
  return (await r.json()).data ?? [];
}

export function useAuditStandards() {
  return useQuery({ queryKey: KEYS.all, queryFn: fetchStandards, staleTime: 5 * 60 * 1000 });
}

export function useCreateAuditStandard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      fetch("/api/audit/standards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
        .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.message ?? "Failed"); return j.data as AuditStandard; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateAuditStandard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      fetch(`/api/audit/standards/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
        .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.message ?? "Failed"); return j.data as AuditStandard; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useDeleteAuditStandard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/audit/standards/${id}`, { method: "DELETE" }).then(async (r) => { if (!r.ok) throw new Error("Failed"); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
