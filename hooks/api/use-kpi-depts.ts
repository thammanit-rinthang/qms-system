import { useQuery } from "@tanstack/react-query";

export interface KpiDeptItem {
  id: string;
  name: string;
  emailGroup: string | null;
  isActive: boolean;
  sortOrder: number;
}

async function fetchKpiDepts(): Promise<KpiDeptItem[]> {
  const res = await fetch("/api/kpi-dept");
  const json = await res.json() as { data: KpiDeptItem[] | null; error: string | null };
  if (!res.ok || json.error) throw new Error(json.error ?? "Failed to load KPI departments");
  return json.data ?? [];
}

export function useKpiDepts() {
  return useQuery<KpiDeptItem[]>({
    queryKey: ["kpi-depts"],
    queryFn: fetchKpiDepts,
    staleTime: 5 * 60_000,
  });
}
