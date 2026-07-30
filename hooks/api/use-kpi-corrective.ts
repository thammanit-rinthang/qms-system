import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface CorrectiveActionPayload {
  times: number;
  rootCause: string;
  guidelines: string;
  responsiblePerson: string;
  dueDate: string;
}

async function extractError(res: Response): Promise<string> {
  try {
    const json = await res.json();
    return json.error?.message ?? json.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

export function useCorrectiveActions(kpiId: string | null, reportId: string | null, detailId: string | null) {
  return useQuery({
    queryKey: ["correctiveActions", detailId],
    queryFn: async () => {
      const res = await fetch(`/api/kpi/${kpiId}/monthly/${reportId}/details/${detailId}/corrective-actions`);
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    enabled: !!kpiId && !!reportId && !!detailId,
  });
}

export function useAddCorrectiveAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, reportId, detailId, data }: { kpiId: string; reportId: string; detailId: string; data: CorrectiveActionPayload }) => {
      const res = await fetch(`/api/kpi/${kpiId}/monthly/${reportId}/details/${detailId}/corrective-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: (_, { detailId, reportId, kpiId }) => {
      qc.invalidateQueries({ queryKey: ["correctiveActions", detailId] });
      qc.invalidateQueries({ queryKey: ["kpiMonthlyReport", reportId] });
      qc.invalidateQueries({ queryKey: ["kpiMonthly", kpiId] });
    },
  });
}

export function useDeleteCorrectiveAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, reportId, detailId, actionId }: { kpiId: string; reportId: string; detailId: string; actionId: string }) => {
      const res = await fetch(`/api/kpi/${kpiId}/monthly/${reportId}/details/${detailId}/corrective-actions/${actionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: (_, { detailId, reportId, kpiId }) => {
      qc.invalidateQueries({ queryKey: ["correctiveActions", detailId] });
      qc.invalidateQueries({ queryKey: ["kpiMonthlyReport", reportId] });
      qc.invalidateQueries({ queryKey: ["kpiMonthly", kpiId] });
    },
  });
}
