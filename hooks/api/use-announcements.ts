import { useQuery } from "@tanstack/react-query";

export interface TickerItem {
  id: string;
  title: string;
  sourceSystem: string;
}

async function fetchTicker(): Promise<TickerItem[]> {
  const res = await fetch("/api/announcements/ticker");
  const json = await res.json() as { data: TickerItem[] | null; error: string | null };
  if (!res.ok || json.error) throw new Error(json.error ?? "Failed to load ticker");
  return json.data ?? [];
}

export function useAnnouncementsTicker() {
  return useQuery<TickerItem[]>({
    queryKey: ["announcements", "ticker"],
    queryFn: fetchTicker,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
