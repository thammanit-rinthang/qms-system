import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AuditScheduleRow } from "@/types/audit";
import type { AuditScheduleCreateInput, AuditScheduleUpdateInput, AuditScheduleConfirmInput } from "@/lib/validations/audit";

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchSchedules(planId: string): Promise<AuditScheduleRow[]> {
  const res = await fetch(`/api/audit/plans/${planId}/schedules`);
  if (!res.ok) throw new Error("Failed to fetch schedules");
  const json = await res.json();
  return json.data ?? [];
}

async function createSchedule(planId: string, input: AuditScheduleCreateInput): Promise<AuditScheduleRow> {
  const res = await fetch(`/api/audit/plans/${planId}/schedules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to create schedule");
  }
  const json = await res.json();
  return json.data;
}

async function updateSchedule(id: string, input: AuditScheduleUpdateInput): Promise<AuditScheduleRow> {
  const res = await fetch(`/api/audit/schedules/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to update schedule");
  }
  const json = await res.json();
  return json.data;
}

async function deleteSchedule(id: string): Promise<void> {
  const res = await fetch(`/api/audit/schedules/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to delete schedule");
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuditSchedules(planId: string) {
  return useQuery({
    queryKey: ["audit-schedules", planId],
    queryFn: () => fetchSchedules(planId),
  });
}

export function useCreateSchedule(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AuditScheduleCreateInput) => createSchedule(planId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-schedules", planId] });
      qc.invalidateQueries({ queryKey: ["audit-plan", planId] });
    },
  });
}

export function useUpdateSchedule(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AuditScheduleUpdateInput }) =>
      updateSchedule(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-schedules", planId] });
      qc.invalidateQueries({ queryKey: ["audit-plan", planId] });
    },
  });
}

export function useConfirmSchedule(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AuditScheduleConfirmInput }) =>
      fetch(`/api/audit/schedules/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }).then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((json as { message?: string }).message ?? "Failed");
        return json.data as AuditScheduleRow;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-schedules", planId] });
    },
  });
}

export function useAcceptSuggestedDate(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/audit/schedules/${id}/accept-suggested-date`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { message?: string }).message ?? "Failed");
      return json.data as AuditScheduleRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-schedules", planId] });
      qc.invalidateQueries({ queryKey: ["audit-plan", planId] });
    },
  });
}

export function useDeleteSchedule(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-schedules", planId] });
      qc.invalidateQueries({ queryKey: ["audit-plan", planId] });
    },
  });
}

export function useSubmitChecklist(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const fd = new FormData();
      // Use URL-encoded filename to bypass Next.js/Undici multipart non-ASCII body parsing bugs
      const safeName = encodeURIComponent(file.name);
      fd.append("file", file, safeName);
      fd.append("filename", file.name);
      const r = await fetch(`/api/audit/schedules/${id}/submit-checklist`, { method: "POST", body: fd });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((json as { message?: string }).message ?? "Failed");
      return json.data as { schedule: AuditScheduleRow };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-schedules", planId] });
    },
  });
}
