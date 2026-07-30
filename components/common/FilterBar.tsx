"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FilterOption = { label: string; value: string };

export type FilterConfig = {
  /** Matches the key in filterValues / onFilterChange */
  key: string;
  /** Label shown above the select */
  label: string;
  /** Dropdown options (excluding the implicit "All" option) */
  options: FilterOption[];
  /** Text for the empty/all option. Defaults to `"All {label}"` */
  allLabel?: string;
  /** Minimum width of the select wrapper (default "10rem") */
  minWidth?: string;
};

type Props = {
  // ── Search ──────────────────────────────────────────────────────────────────
  /** Raw (immediate) value for the controlled search input */
  searchValue?: string;
  /** Called on every keystroke — hook up to setParam("search", v) */
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;

  // ── Filter selects ──────────────────────────────────────────────────────────
  filters?: FilterConfig[];
  /** Current value for each filter key */
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;

  // ── Actions ──────────────────────────────────────────────────────────────────
  /** Show the "Clear Filters" button */
  hasActiveFilters?: boolean;
  onClearAll?: () => void;
  clearLabel?: string;

  // ── Count display ────────────────────────────────────────────────────────────
  /** Number of records after filtering */
  resultCount?: number;
  /** Total records before filtering */
  totalCount?: number;
  /** Noun appended to the count, e.g. "users" → "12 / 50 users" */
  countLabel?: string;

  // ── Extras ───────────────────────────────────────────────────────────────────
  /** Slot for custom controls (sort toggles, export button, etc.) */
  children?: ReactNode;
  className?: string;
};

/**
 * Standard filter bar: debounced search input + generic select dropdowns +
 * clear-all button + result count.
 *
 * Pair with `useUrlFilters` so state is bound to the URL automatically.
 *
 * @example
 * const { params, rawValues, setParam, clearAll, hasFilters } = useUrlFilters({
 *   keys: ["search", "role"],
 *   searchKey: "search",
 * });
 *
 * <FilterBar
 *   searchValue={rawValues.search}
 *   onSearchChange={(v) => setParam("search", v)}
 *   filters={[{ key: "role", label: "Role", options: ROLE_OPTIONS }]}
 *   filterValues={params}
 *   onFilterChange={setParam}
 *   hasActiveFilters={hasFilters}
 *   onClearAll={clearAll}
 *   resultCount={filtered.length}
 *   totalCount={users.length}
 *   countLabel="users"
 * />
 */
export default function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  searchLabel = "Search",
  filters = [],
  filterValues = {},
  onFilterChange,
  hasActiveFilters = false,
  onClearAll,
  clearLabel = "Clear Filters",
  resultCount,
  totalCount,
  countLabel = "items",
  children,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "card-premium px-5 py-4 mb-4 flex flex-wrap gap-3 items-end",
        className,
      )}
    >
      {/* Search input */}
      {onSearchChange !== undefined && (
        <div className="flex-1 min-w-44">
          <label className="text-[11px] text-neutral mb-1 block">{searchLabel}</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-neutral">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <Input
              type="text"
              className="pl-9 h-8 text-[13px] w-full"
              placeholder={searchPlaceholder}
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Dynamic filter selects */}
      {filters.map((f) => (
        <div key={f.key} style={{ minWidth: f.minWidth ?? "10rem" }}>
          <label className="text-[11px] text-neutral mb-1 block">{f.label}</label>
          <Select
            value={filterValues[f.key] || "ALL"}
            onValueChange={(val) => onFilterChange?.(f.key, val === "ALL" ? "" : val)}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder={f.allLabel ?? `All ${f.label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{f.allLabel ?? `All ${f.label}`}</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      {/* Custom slot (sort toggles, date pickers, export, etc.) */}
      {children}

      {/* Clear all */}
      {hasActiveFilters && onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          className="text-[13px] self-end"
          onClick={onClearAll}
        >
          {clearLabel}
        </Button>
      )}

      {/* Result count */}
      {resultCount !== undefined && totalCount !== undefined && (
        <div className="self-end ml-auto text-[11px] md:text-xs text-neutral whitespace-nowrap">
          {resultCount} / {totalCount} {countLabel}
        </div>
      )}
    </div>
  );
}
