import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AuditFindingRow, AuditFindingDetail } from "@/types/audit";
import type {
  AuditFindingCreateInput,
  AuditFindingUpdateInput,
  AuditCorrectiveActionInput,
  AuditVerifyInput,
} from "@/lib/validations/audit";

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchFindings(planId: string, status?: string): Promise<AuditFindingRow[]> {
  const p = new URLSearchParams();
  if (status) p.set("status", status);
  const res = await fetch(`/api/audit/plans/${planId}/findings?${p.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch findings");
  const json = await res.json();
  return json.data ?? [];
}

async function fetchFindingDetail(id: string): Promise<AuditFindingDetail> {
  const res = await fetch(`/api/audit/findings/${id}`);
  if (!res.ok) throw new Error("Failed to fetch finding");
  const json = await res.json();
  return json.data;
}

async function createFinding(planId: string, input: AuditFindingCreateInput): Promise<AuditFindingRow> {
  const res = await fetch(`/api/audit/plans/${planId}/findings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to create finding");
  }
  const json = await res.json();
  return json.data;
}

async function updateFinding(id: string, input: AuditFindingUpdateInput): Promise<AuditFindingRow> {
  const res = await fetch(`/api/audit/findings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to update finding");
  }
  const json = await res.json();
  return json.data;
}

async function respondToFinding(id: string, input: AuditCorrectiveActionInput): Promise<void> {
  const res = await fetch(`/api/audit/findings/${id}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to respond to finding");
  }
}

async function verifyFinding(id: string, input: AuditVerifyInput): Promise<void> {
  const res = await fetch(`/api/audit/findings/${id}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to verify finding");
  }
}

async function closeFinding(id: string): Promise<void> {
  const res = await fetch(`/api/audit/findings/${id}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to close finding");
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuditFindings(planId: string, status?: string) {
  return useQuery({
    queryKey: ["audit-findings", planId, status ?? "all"],
    queryFn: () => fetchFindings(planId, status),
  });
}

export function useAuditFindingDetail(id: string) {
  return useQuery({
    queryKey: ["audit-finding", id],
    queryFn: () => fetchFindingDetail(id),
  });
}

export function useCreateFinding(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AuditFindingCreateInput) => createFinding(planId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-findings", planId] });
      qc.invalidateQueries({ queryKey: ["audit-plan", planId] });
    },
  });
}

export function useUpdateFinding(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AuditFindingUpdateInput }) =>
      updateFinding(id, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["audit-findings", planId] });
      qc.invalidateQueries({ queryKey: ["audit-finding", variables.id] });
    },
  });
}

export function useRespondToFinding(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AuditCorrectiveActionInput }) =>
      respondToFinding(id, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["audit-findings", planId] });
      qc.invalidateQueries({ queryKey: ["audit-finding", variables.id] });
    },
  });
}

export function useVerifyFinding(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AuditVerifyInput }) =>
      verifyFinding(id, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["audit-findings", planId] });
      qc.invalidateQueries({ queryKey: ["audit-finding", variables.id] });
    },
  });
}

export function useCloseFinding(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeFinding(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["audit-findings", planId] });
      qc.invalidateQueries({ queryKey: ["audit-finding", id] });
    },
  });
}
