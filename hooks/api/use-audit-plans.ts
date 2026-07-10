import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AuditPlanListResponse, AuditPlanSummary } from "@/types/audit";
import type { AuditPlanCreateInput, AuditPlanUpdateInput } from "@/lib/validations/audit";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const auditPlanKeys = {
  all: ["audit-plans"] as const,
  list: (params: Record<string, string | number | undefined>) =>
    ["audit-plans", "list", params] as const,
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

export type AuditPlanListParams = {
  page?: number;
  limit?: number;
  search?: string;
  auditType?: string;
  status?: string;
};

async function fetchAuditPlans(params: AuditPlanListParams): Promise<AuditPlanListResponse> {
  const p = new URLSearchParams();
  if (params.page) p.set("page", String(params.page));
  if (params.limit) p.set("limit", String(params.limit));
  if (params.search) p.set("search", params.search);
  if (params.auditType) p.set("auditType", params.auditType);
  if (params.status) p.set("status", params.status);

  const res = await fetch(`/api/audit/plans?${p.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch audit plans");
  const json = await res.json();
  return {
    data: json.data ?? [],
    meta: json.meta ?? { page: params.page ?? 1, limit: params.limit ?? 20, total: 0 },
  };
}

async function createAuditPlan(input: AuditPlanCreateInput): Promise<AuditPlanSummary> {
  const res = await fetch("/api/audit/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to create audit plan");
  }
  const json = await res.json();
  return json.data;
}

async function updateAuditPlan(id: string, input: AuditPlanUpdateInput): Promise<AuditPlanSummary> {
  const res = await fetch(`/api/audit/plans/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to update audit plan");
  }
  const json = await res.json();
  return json.data;
}

async function deleteAuditPlan(id: string): Promise<void> {
  const res = await fetch(`/api/audit/plans/${id}/delete`, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to delete audit plan");
  }
}

async function cancelAuditPlan(id: string, reason?: string): Promise<void> {
  const res = await fetch(`/api/audit/plans/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to cancel audit plan");
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuditPlans(params: AuditPlanListParams, initialData?: AuditPlanListResponse) {
  return useQuery({
    queryKey: auditPlanKeys.list(params as Record<string, string | number | undefined>),
    queryFn: () => fetchAuditPlans(params),
    initialData,
  });
}

export function useCreateAuditPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAuditPlan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditPlanKeys.all });
    },
  });
}

export function useUpdateAuditPlan(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AuditPlanUpdateInput) => updateAuditPlan(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditPlanKeys.all });
      qc.invalidateQueries({ queryKey: ["audit-plan", id] });
    },
  });
}

export function useDeleteAuditPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteAuditPlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditPlanKeys.all });
    },
  });
}

export function useCancelAuditPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelAuditPlan(id, reason),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: auditPlanKeys.all });
      qc.invalidateQueries({ queryKey: ["audit-plan", variables.id] });
    },
  });
}
