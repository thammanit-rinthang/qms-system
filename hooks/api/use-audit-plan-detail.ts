import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AuditPlanDetail } from "@/types/audit";
import type { AuditAssignAuditorsInput, AuditPlanDepartmentsInput, AuditPlanSubmitInput } from "@/lib/validations/audit";

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchAuditPlanDetail(id: string): Promise<AuditPlanDetail> {
  const res = await fetch(`/api/audit/plans/${id}`);
  if (!res.ok) throw new Error("Failed to fetch audit plan");
  const json = await res.json();
  return json.data;
}

async function submitPlan(planId: string, input: AuditPlanSubmitInput): Promise<void> {
  const res = await fetch(`/api/audit/plans/${planId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to submit plan");
  }
}

async function assignAuditors(planId: string, input: AuditAssignAuditorsInput): Promise<void> {
  const res = await fetch(`/api/audit/plans/${planId}/assign-auditors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to assign auditors");
  }
}

async function setDepartments(planId: string, input: AuditPlanDepartmentsInput): Promise<void> {
  const res = await fetch(`/api/audit/plans/${planId}/departments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to set departments");
  }
}

async function announcePlan(
  planId: string,
  input: { title: string; message: string; deliveryMode?: string; recipientEmails?: string[] }
): Promise<void> {
  const res = await fetch(`/api/audit/plans/${planId}/announce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to announce plan");
  }
}

async function signPlanInApp(planId: string, signedRole: string): Promise<void> {
  const res = await fetch(`/api/audit/plans/${planId}/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signedRole }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to sign plan");
  }
}

async function generateReport(
  planId: string,
  input: { summary?: string; conclusion?: string }
): Promise<void> {
  const res = await fetch(`/api/audit/plans/${planId}/generate-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to generate report");
  }
}

async function completeAudit(planId: string): Promise<void> {
  const res = await fetch(`/api/audit/plans/${planId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to complete audit");
  }
}

async function closePlan(planId: string): Promise<void> {
  const res = await fetch(`/api/audit/plans/${planId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to close plan");
  }
}

async function issueSignRequest(
  planId: string,
  input: { targetAuthUserId: string; targetEmail: string; targetName?: string; signedRole: string }
): Promise<void> {
  const res = await fetch(`/api/audit/plans/${planId}/sign-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? "Failed to issue sign request");
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuditPlanDetail(id: string, initialData?: AuditPlanDetail) {
  return useQuery({
    queryKey: ["audit-plan", id],
    queryFn: () => fetchAuditPlanDetail(id),
    initialData,
  });
}

export function useSubmitPlan(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AuditPlanSubmitInput) => submitPlan(planId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-plan", planId] });
      qc.invalidateQueries({ queryKey: ["audit-plans"] });
    },
  });
}

export function useAssignAuditors(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AuditAssignAuditorsInput) => assignAuditors(planId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-plan", planId] });
    },
  });
}

export function useSetDepartments(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AuditPlanDepartmentsInput) => setDepartments(planId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-plan", planId] });
    },
  });
}

export function useAnnouncePlan(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; message: string; deliveryMode?: string; recipientEmails?: string[] }) =>
      announcePlan(planId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-plan", planId] });
      qc.invalidateQueries({ queryKey: ["audit-plans"] });
    },
  });
}

export function useSignPlanInApp(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (signedRole: string) => signPlanInApp(planId, signedRole),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-plan", planId] });
    },
  });
}

export function useGenerateReport(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { summary?: string; conclusion?: string }) => generateReport(planId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-plan", planId] });
      qc.invalidateQueries({ queryKey: ["audit-plans"] });
    },
  });
}

export function useCompleteAudit(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => completeAudit(planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-plan", planId] });
      qc.invalidateQueries({ queryKey: ["audit-plans"] });
    },
  });
}

export function useClosePlan(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => closePlan(planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-plan", planId] });
      qc.invalidateQueries({ queryKey: ["audit-plans"] });
    },
  });
}

export function useIssueSignRequest(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { targetAuthUserId: string; targetEmail: string; targetName?: string; signedRole: string }) =>
      issueSignRequest(planId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-plan", planId] });
    },
  });
}
