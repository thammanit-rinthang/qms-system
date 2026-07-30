/**
 * Per-module brand colors used across notification badges, announcement
 * accent bars, and other module-specific visual markers.
 */
export type ModuleKey = "CAR" | "DAR" | "KPI" | "KPI_MONTHLY" | "AUDIT";

export const MODULE_COLORS: Record<
  ModuleKey,
  { bg: string; text: string; dot: string; brand: string; label: string }
> = {
  CAR:         { bg: "bg-orange-100",  text: "text-orange-700",  dot: "bg-orange-400",  brand: "#ea580c", label: "CAR"         },
  DAR:         { bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500",    brand: "#2563eb", label: "DAR"         },
  KPI:         { bg: "bg-green-100",   text: "text-green-700",   dot: "bg-green-500",   brand: "#16a34a", label: "KPI"         },
  KPI_MONTHLY: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", brand: "#059669", label: "KPI Monthly" },
  AUDIT:       { bg: "bg-violet-100",  text: "text-violet-700",  dot: "bg-violet-500",  brand: "#7c3aed", label: "Audit"       },
};

export const FALLBACK_MODULE_COLORS = {
  bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", brand: "#64748b", label: "—",
};

/** Returns module meta or fallback for unknown modules. */
export function getModuleMeta(module: string) {
  return MODULE_COLORS[module as ModuleKey] ?? FALLBACK_MODULE_COLORS;
}

/**
 * Simplified brand-color-only map for announcement accent bars.
 * Keys: announcement sourceSystem values (QMS, IT, HR, GA, SAFETY, + module keys).
 */
export const SOURCE_BRAND_COLORS: Record<string, string> = {
  QMS:    "#0F1059",
  IT:     "#1D6A8A",
  HR:     "#7C3AED",
  GA:     "#059669",
  SAFETY: "#DC2626",
  CAR:    "#ea580c",
  DAR:    "#2563eb",
  KPI:    "#16a34a",
  AUDIT:  "#7c3aed",
};
