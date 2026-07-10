import { useQuery } from "@tanstack/react-query";

export interface EmailGroup {
  id: string;
  displayName: string;
  mail: string | null;
}

async function fetchEmailGroups(): Promise<EmailGroup[]> {
  const res = await fetch("/api/ms-graph/groups/search?q=");
  const json = await res.json() as { data?: EmailGroup[] };
  return json.data ?? [];
}

export function useEmailGroups() {
  return useQuery<EmailGroup[]>({
    queryKey: ["email-groups"],
    queryFn: fetchEmailGroups,
    staleTime: 10 * 60_000,
  });
}
