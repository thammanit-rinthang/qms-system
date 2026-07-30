import { useQuery, UseQueryOptions, UseQueryResult, QueryKey } from "@tanstack/react-query";
import { useEffect, useState } from "react";

// Realtime classes
// Class A: Realtime polling 5s (high urgency workflows like approval queues)
// Class B: Realtime polling 15-30s (medium urgency like dashboards/operational lists)
// Class C: No polling (mutate & invalidate only, typical admin/CRUD pages)
export type RealtimeClass = "A" | "B" | "C";

export interface UseAppQueryOptions<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
> extends Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "queryKey"> {
  queryKey: TQueryKey;
  realtimeClass?: RealtimeClass;
  customIntervalMs?: number;
  realtimeEnabled?: boolean; // toggle to disable polling for this query
}

/**
 * Custom query hook wrapper around TanStack Query's useQuery.
 * Implements Class A/B/C query intervals, visibility-aware polling, and modular feature flags.
 */
export function useAppQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(options: UseAppQueryOptions<TQueryFnData, TError, TData, TQueryKey>): UseQueryResult<TData, TError> {
  const {
    queryKey,
    realtimeClass = "C",
    customIntervalMs,
    realtimeEnabled = true,
    ...restOptions
  } = options;

  // Track tab/page visibility to pause polling in background
  const [isTabVisible, setIsTabVisible] = useState(
    typeof document !== "undefined" ? document.visibilityState === "visible" : true
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Determine module name from the first element of queryKey
  const firstKey = queryKey[0];
  const moduleName = typeof firstKey === "string" ? firstKey.toLowerCase() : "unknown";

  // Check if polling is disabled via localStorage for this module or globally
  const [pollingDisabled, setPollingDisabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) return;
    const checkFlags = () => {
      const disableAll = window.localStorage.getItem("qms_realtime_disable_all") === "true";
      const disableModule = window.localStorage.getItem(`qms_realtime_disable_${moduleName}`) === "true";
      setPollingDisabled(disableAll || disableModule);
    };

    checkFlags();

    // Listen to storage changes to allow developer debugging/toggles in real time
    window.addEventListener("storage", checkFlags);
    return () => window.removeEventListener("storage", checkFlags);
  }, [moduleName]);

  // Determine polling interval based on class, visibility, and feature flags
  let intervalMs: number | false = false;

  if (realtimeEnabled && isTabVisible && !pollingDisabled) {
    if (customIntervalMs !== undefined) {
      intervalMs = customIntervalMs;
    } else if (realtimeClass === "A") {
      intervalMs = 5000; // 5 seconds
    } else if (realtimeClass === "B") {
      intervalMs = 15000; // 15 seconds
    }
  }

  const isRealtime = realtimeClass === "A" || realtimeClass === "B";

  // Default query policies
  const defaultStaleTime = isRealtime ? 0 : 30000; // 0 for realtime (force polling fetch), 30s cache for standard
  const defaultRefetchOnWindowFocus = true; // Focus refetch ensures fresh data on tab active
  const defaultRetry = isRealtime ? 1 : 2; // Prevent infinite error spam on offline realtime routes

  return useQuery({
    queryKey,
    staleTime: restOptions.staleTime ?? defaultStaleTime,
    refetchOnWindowFocus: restOptions.refetchOnWindowFocus ?? defaultRefetchOnWindowFocus,
    retry: restOptions.retry ?? defaultRetry,
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false, // Double safety: TanStack Query built-in background polling pause
    ...restOptions,
  });
}
