import { useQuery } from "@tanstack/react-query";

export interface Department {
  id: string;
  name: string;
  emailGroup: string | null;
}

async function fetchDepartments(): Promise<Department[]> {
  const res = await fetch("/api/departments");
  const json = await res.json() as { data: Department[] | null; error: string | null };
  if (!res.ok || json.error) throw new Error(json.error ?? "Failed to load departments");
  return json.data ?? [];
}

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
    staleTime: 5 * 60_000,
  });
}
