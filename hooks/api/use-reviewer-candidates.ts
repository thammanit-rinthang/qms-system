import { useQuery } from "@tanstack/react-query";

export interface ReviewerCandidate {
  id: string;
  name: string;
  email: string | null;
  employeeId: string | null;
  department: string | null;
  jobTitle: string | null;
}

async function fetchReviewerCandidates(q: string): Promise<ReviewerCandidate[]> {
  const url = q.length > 0
    ? `/api/ms-graph/users/search?q=${encodeURIComponent(q)}`
    : `/api/ms-graph/users/search`;
  const res = await fetch(url);
  const json = await res.json() as { data: ReviewerCandidate[] | null; error: string | null };
  if (json.error) throw new Error(json.error);
  return json.data ?? [];
}

export function useReviewerCandidates(q: string, enabled: boolean) {
  return useQuery<ReviewerCandidate[]>({
    queryKey: ["reviewerCandidates", q],
    queryFn: () => fetchReviewerCandidates(q),
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
