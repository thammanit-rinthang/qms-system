import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface MonthlyReportQuery {
  page?: number;
  limit?: number;
  year?: number;
  month?: string;
  department?: string;
  status?: string;
}

async function extractError(res: Response): Promise<string> {
  try {
    const json = await res.json();
    return json.error?.message ?? json.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

function buildParams(q: MonthlyReportQuery): string {
  const p = new URLSearchParams();
  if (q.page) p.set("page", String(q.page));
  if (q.limit) p.set("limit", String(q.limit));
  if (q.year) p.set("year", String(q.year));
  if (q.month) p.set("month", q.month);
  if (q.department) p.set("department", q.department);
  if (q.status) p.set("status", q.status);
  return p.toString();
}

export function useKpiMonthlyList(kpiId: string, query: MonthlyReportQuery) {
  return useQuery({
    queryKey: ["kpiMonthly", kpiId, query],
    queryFn: async () => {
      const res = await fetch(`/api/kpi/${kpiId}/monthly?${buildParams(query)}`);
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    enabled: !!kpiId,
  });
}

export function useKpiMonthlyById(kpiId: string | null, reportId: string | null) {
  return useQuery({
    queryKey: ["kpiMonthlyReport", reportId],
    queryFn: async () => {
      const res = await fetch(`/api/kpi/${kpiId}/monthly/${reportId}`);
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    enabled: !!kpiId && !!reportId,
  });
}

export function useCreateMonthlyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, month, year }: { kpiId: string; month: string; year: number }) => {
      const res = await fetch(`/api/kpi/${kpiId}/monthly`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: (_, { kpiId }) => qc.invalidateQueries({ queryKey: ["kpiMonthly", kpiId] }),
  });
}

export function useUpdateMonthlyDetail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, reportId, detailId, data }: { kpiId: string; reportId: string; detailId: string; data: { actualResult?: number | null; achievedStatus?: string } }) => {
      const res = await fetch(`/api/kpi/${kpiId}/monthly/${reportId}/details/${detailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: (_, { kpiId, reportId }) => {
      qc.invalidateQueries({ queryKey: ["kpiMonthly", kpiId] });
      qc.invalidateQueries({ queryKey: ["kpiMonthlyReport", reportId] });
    },
  });
}

export function useUpdateMonthlyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, reportId, data }: { kpiId: string; reportId: string; data: { remark?: string | null } }) => {
      const res = await fetch(`/api/kpi/${kpiId}/monthly/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: (_, { kpiId, reportId }) => {
      qc.invalidateQueries({ queryKey: ["kpiMonthly", kpiId] });
      qc.invalidateQueries({ queryKey: ["kpiMonthlyReport", reportId] });
    },
  });
}

export function useUploadMonthlyAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, reportId, file }: { kpiId: string; reportId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/kpi/${kpiId}/monthly/${reportId}/attachment`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: (_, { kpiId, reportId }) => {
      qc.invalidateQueries({ queryKey: ["kpiMonthly", kpiId] });
      qc.invalidateQueries({ queryKey: ["kpiMonthlyReport", reportId] });
    },
  });
}

export function useSubmitMonthlyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, reportId, data }: { kpiId: string; reportId: string; data?: { signatureDataUrl?: string; signatureType?: string; saveSignature?: boolean; reviewerUserId?: string; approverUserId?: string } }) => {
      const res = await fetch(`/api/kpi/${kpiId}/monthly/${reportId}/submit`, {
        method: "POST",
        headers: data ? { "Content-Type": "application/json" } : undefined,
        body: data ? JSON.stringify(data) : undefined,
      });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: (_, { kpiId, reportId }) => {
      qc.invalidateQueries({ queryKey: ["kpiMonthly", kpiId] });
      qc.invalidateQueries({ queryKey: ["kpiMonthlyReport", reportId] });
    },
  });
}

export function useReviewMonthlyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, reportId, data }: { kpiId: string; reportId: string; data?: { signatureDataUrl?: string; signatureType?: string; saveSignature?: boolean } }) => {
      const res = await fetch(`/api/kpi/${kpiId}/monthly/${reportId}/review`, {
        method: "POST",
        headers: data ? { "Content-Type": "application/json" } : undefined,
        body: data ? JSON.stringify(data) : undefined,
      });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: (_, { kpiId, reportId }) => {
      qc.invalidateQueries({ queryKey: ["kpiMonthly", kpiId] });
      qc.invalidateQueries({ queryKey: ["kpiMonthlyReport", reportId] });
    },
  });
}

export function useApproveMonthlyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, reportId, data }: { kpiId: string; reportId: string; data?: { signatureDataUrl?: string; signatureType?: string; saveSignature?: boolean } }) => {
      const res = await fetch(`/api/kpi/${kpiId}/monthly/${reportId}/approve`, {
        method: "POST",
        headers: data ? { "Content-Type": "application/json" } : undefined,
        body: data ? JSON.stringify(data) : undefined,
      });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: (_, { kpiId, reportId }) => {
      qc.invalidateQueries({ queryKey: ["kpiMonthly", kpiId] });
      qc.invalidateQueries({ queryKey: ["kpiMonthlyReport", reportId] });
    },
  });
}

export function useRejectMonthlyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, reportId, reason }: { kpiId: string; reportId: string; reason: string }) => {
      const res = await fetch(`/api/kpi/${kpiId}/monthly/${reportId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: (_, { kpiId, reportId }) => {
      qc.invalidateQueries({ queryKey: ["kpiMonthly", kpiId] });
      qc.invalidateQueries({ queryKey: ["kpiMonthlyReport", reportId] });
    },
  });
}
