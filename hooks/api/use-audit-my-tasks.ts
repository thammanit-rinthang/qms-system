import { useQuery } from "@tanstack/react-query";
import type { AuditPlanStatus, FindingCategory, FindingSeverity, FindingStatus } from "@/types/audit";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MyTaskFinding = {
  id: string;
  planId: string;
  planTitle: string;
  planAuditNo: string;
  findingNo: string;
  title: string;
  category: FindingCategory;
  severity: FindingSeverity;
  status: FindingStatus;
  ownerNameSnapshot: string | null;
  dueAt: string | null;
  createdAt: string;
};

export type MyTaskPlan = {
  id: string;
  auditNo: string;
  title: string;
  status: AuditPlanStatus;
  startDate: string | null;
  endDate: string | null;
  ownerNameSnapshot: string | null;
  updatedAt: string;
};

export type MyTaskSignoffPlan = {
  id: string;
  auditNo: string;
  title: string;
  status: AuditPlanStatus;
  ownerNameSnapshot: string | null;
  updatedAt: string;
};

export type AuditMyTasksData = {
  toRespond: MyTaskFinding[];
  toVerify: MyTaskFinding[];
  leadingPlans: MyTaskPlan[];
  pendingSignoffs: MyTaskSignoffPlan[];
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchAuditMyTasks(): Promise<AuditMyTasksData> {
  const res = await fetch("/api/audit/my-tasks");
  if (!res.ok) throw new Error("Failed to fetch my audit tasks");
  const json = await res.json();
  return json.data;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuditMyTasks() {
  return useQuery({
    queryKey: ["audit-my-tasks"],
    queryFn: fetchAuditMyTasks,
    staleTime: 30_000,
  });
}
