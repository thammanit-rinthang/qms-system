import { useQuery } from "@tanstack/react-query";

export interface AuditLogFilter {
  page?: number;
  limit?: number;
  action?: string;
  resourceType?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface AuditLogRow {
  id: string;
  actorUserId: string;
  actorName: string | null;
  actorEmail: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  before: unknown;
  after: unknown;
  metadata: unknown;
  createdAt: string;
}

interface AuditLogListResponse {
  success: boolean;
  data: AuditLogRow[];
  meta: { page: number; limit: number; total: number };
}

function buildParams(filter: AuditLogFilter): URLSearchParams {
  const sp = new URLSearchParams();
  if (filter.page)         sp.set("page",         String(filter.page));
  if (filter.limit)        sp.set("limit",        String(filter.limit));
  if (filter.action)       sp.set("action",       filter.action);
  if (filter.resourceType) sp.set("resourceType", filter.resourceType);
  if (filter.search)       sp.set("search",       filter.search);
  if (filter.from)         sp.set("from",         filter.from);
  if (filter.to)           sp.set("to",           filter.to);
  return sp;
}

async function fetchAuditLogs(filter: AuditLogFilter): Promise<AuditLogListResponse> {
  const sp = buildParams(filter);
  const res = await fetch(`/api/audit-logs?${sp.toString()}`);
  const json = await res.json() as AuditLogListResponse;
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return json;
}

export function useAuditLogs(filter: AuditLogFilter) {
  return useQuery<AuditLogListResponse>({
    queryKey: ["audit-logs", filter],
    queryFn: () => fetchAuditLogs(filter),
    staleTime: 30_000,
  });
}

/** Returns a URL string for direct download — use as href on an <a> tag */
export function buildExportUrl(filter: Omit<AuditLogFilter, "page" | "limit">): string {
  const sp = buildParams(filter);
  return `/api/audit-logs/export?${sp.toString()}`;
}
