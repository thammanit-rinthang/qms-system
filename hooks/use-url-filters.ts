"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebounce } from "./use-debounce";

type UseUrlFiltersOptions = {
  /**
   * All URL param keys managed by this hook (search + filters + sort, etc.).
   * Order is preserved when building the URL.
   */
  keys: readonly string[];
  /**
   * The key whose value should be debounced before writing to the URL.
   * Usually "search" or "q". Other keys update the URL immediately.
   */
  searchKey?: string;
  /** Debounce delay in ms (default 300). */
  debounceMs?: number;
};

/** Builds a URL string from the given values, omitting empty strings. */
function toUrl(
  pathname: string,
  keys: readonly string[],
  values: Record<string, string>,
  searchKey: string | undefined,
  resolvedSearch: string,
): string {
  const p = new URLSearchParams();
  for (const k of keys) {
    const v = k === searchKey ? resolvedSearch : (values[k] ?? "");
    if (v) p.set(k, v);
  }
  const qs = p.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Manages filter / search state that is bound to URL search params.
 *
 * - Non-search params (filters, sort) update the URL immediately on change.
 * - The `searchKey` param is debounced so the URL (and any server re-fetch)
 *   only fires after the user stops typing.
 * - Refreshing the page restores all filters from the URL.
 *
 * @example
 * const { params, rawValues, setParam, clearAll, hasFilters } = useUrlFilters({
 *   keys: ["search", "role", "dept"],
 *   searchKey: "search",
 * });
 *
 * // Controlled input — use rawValues (immediate)
 * <Input value={rawValues.search} onChange={(e) => setParam("search", e.target.value)} />
 *
 * // Filtering — use params (debounced for search)
 * const filtered = useMemo(() =>
 *   users.filter((u) => u.name.includes(params.search)),
 *   [users, params.search],
 * );
 */
export function useUrlFilters({
  keys,
  searchKey,
  debounceMs = 300,
}: UseUrlFiltersOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from the current URL
  const [rawValues, setRawValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(keys.map((k) => [k, searchParams.get(k) ?? ""])),
  );

  const debouncedSearch = useDebounce(
    searchKey ? (rawValues[searchKey] ?? "") : "",
    debounceMs,
  );

  // Stable ref so callbacks never go stale
  const ref = useRef({ rawValues, debouncedSearch, pathname, keys, searchKey });
  ref.current = { rawValues, debouncedSearch, pathname, keys, searchKey };

  // Sync debounced search → URL (fires only when debounced value settles)
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!searchKey) return;
    const { rawValues: rv, debouncedSearch: ds, pathname: p, keys: k, searchKey: sk } = ref.current;
    router.replace(toUrl(p, k, rv, sk, ds), { scroll: false });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Update a single param.
   * - Non-search keys → URL updated immediately.
   * - Search key → URL updated after debounce.
   */
  const setParam = useCallback(
    (key: string, value: string) => {
      // Compute next values outside the updater — router.replace is a side effect
      // and must not be called inside a setState updater (renders another component).
      const next = { ...ref.current.rawValues, [key]: value };
      setRawValues(next);
      if (key !== ref.current.searchKey) {
        const { debouncedSearch: ds, pathname: p, keys: k, searchKey: sk } = ref.current;
        router.replace(toUrl(p, k, next, sk, ds), { scroll: false });
      }
    },
    [router],
  );

  const setParams = useCallback(
    (updates: Record<string, string>) => {
      const next = { ...ref.current.rawValues, ...updates };
      setRawValues(next);
      const { debouncedSearch: ds, pathname: p, keys: k, searchKey: sk } = ref.current;
      router.replace(toUrl(p, k, next, sk, ds), { scroll: false });
    },
    [router],
  );

  /** Reset all params and clear the URL. */
  const clearAll = useCallback(() => {
    const empty = Object.fromEntries(ref.current.keys.map((k) => [k, ""]));
    setRawValues(empty);
    router.replace(ref.current.pathname, { scroll: false });
  }, [router]);

  const hasFilters = keys.some((k) => rawValues[k] !== "");

  /**
   * Effective params to use for filtering / fetching.
   * The search key is debounced; all others are immediate.
   */
  const params: Record<string, string> = searchKey
    ? { ...rawValues, [searchKey]: debouncedSearch }
    : { ...rawValues };

  return {
    /** Debounced values — use for filtering/fetching logic. */
    params,
    /** Immediate values — use as `value` on controlled inputs. */
    rawValues,
    setParam,
    setParams,
    clearAll,
    /** True when any param is non-empty (used to show/hide Clear button). */
    hasFilters,
  };
}
