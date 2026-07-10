import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AuditAttachmentRow } from "@/types/audit";
import type { AuditAttachmentCreateInput } from "@/lib/validations/audit";

// ─── Upload (multipart) ───────────────────────────────────────────────────────

async function uploadAttachment(
  planId: string,
  file: File,
): Promise<AuditAttachmentRow> {
  const form = new FormData();
  form.append("file", file);
  form.append("planId", planId);
  form.append("resourceType", "PLAN");
  form.append("resourceId", planId);
  const res = await fetch("/api/audit/attachments/upload", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error((json as { message?: string }).message ?? "Upload failed");
  return (json as { data: AuditAttachmentRow }).data;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchAttachments(resourceType: string, resourceId: string): Promise<AuditAttachmentRow[]> {
  const p = new URLSearchParams({ resourceType, resourceId });
  const res = await fetch(`/api/audit/attachments?${p.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch attachments");
  const json = await res.json();
  return json.data ?? [];
}

async function createAttachment(input: AuditAttachmentCreateInput): Promise<AuditAttachmentRow> {
  const res = await fetch("/api/audit/attachments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to save attachment");
  }
  const json = await res.json();
  return json.data;
}

async function deleteAttachment(id: string): Promise<void> {
  const res = await fetch(`/api/audit/attachments/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to delete attachment");
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuditAttachments(resourceType: string, resourceId: string) {
  return useQuery({
    queryKey: ["audit-attachments", resourceType, resourceId],
    queryFn: () => fetchAttachments(resourceType, resourceId),
    enabled: Boolean(resourceId),
  });
}

export function useCreateAuditAttachment(resourceType: string, resourceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAttachment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-attachments", resourceType, resourceId] });
    },
  });
}

export function useDeleteAuditAttachment(resourceType: string, resourceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAttachment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-attachments", resourceType, resourceId] });
    },
  });
}

export function useUploadAuditAttachment(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadAttachment(planId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-attachments", "PLAN", planId] });
    },
  });
}
