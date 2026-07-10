import { useQuery } from "@tanstack/react-query";
import type { FindingCategory, FindingSeverity, FindingStatus } from "@/types/audit";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditDashboardCounts = {
  totalPlans: number;
  inProgressPlans: number;
  waitingCorrectivePlans: number;
  openFindings: number;
  overdueCorrectiveActions: number;
  pendingSignoffs: number;
};

export type AuditDashboardSchedule = {
  id: string;
  planId: string;
  planTitle: string;
  planAuditNo: string;
  sessionTitle: string;
  location: string | null;
  startAt: string;
  endAt: string;
};

export type AuditDashboardFinding = {
  id: string;
  planId: string;
  findingNo: string;
  title: string;
  category: FindingCategory;
  severity: FindingSeverity;
  status: FindingStatus;
  ownerNameSnapshot: string | null;
  dueAt: string | null;
  createdAt: string;
};

export type AuditDashboardData = {
  counts: AuditDashboardCounts;
  upcomingSchedules: AuditDashboardSchedule[];
  recentFindings: AuditDashboardFinding[];
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchAuditDashboard(): Promise<AuditDashboardData> {
  const res = await fetch("/api/audit/dashboard");
  if (!res.ok) throw new Error("Failed to fetch audit dashboard");
  const json = await res.json();
  return json.data;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuditDashboard() {
  return useQuery({
    queryKey: ["audit-dashboard"],
    queryFn: fetchAuditDashboard,
    staleTime: 30_000,
  });
}
