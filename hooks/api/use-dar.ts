import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DarDetail } from "@/types/dar";

async function fetchDarDetail(id: string): Promise<DarDetail> {
  const res = await fetch(`/api/dar/${id}`);
  const json = await res.json() as { data: DarDetail | null; error: string | null };
  if (!res.ok || json.error || !json.data) throw new Error(json.error ?? "Failed to load DAR");
  return json.data;
}

export function useDarDetail(id: string | null) {
  return useQuery<DarDetail>({
    queryKey: ["dar", id],
    queryFn: () => fetchDarDetail(id!),
    enabled: id !== null,
  });
}

export function useDeleteDar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dar/${id}`, { method: "DELETE" });
      const json = await res.json() as { error: string | null };
      if (!res.ok || json.error) throw new Error(json.error ?? "Delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dar"] }),
  });
}
