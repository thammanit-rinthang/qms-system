export function normalizeKpiAnnualPrefix(prefix?: string | null): string {
  const value = prefix?.trim() || "FM-MR-01";
  return value.replace(/\s+Rev\.\d+$/i, "").trim() || "FM-MR-01";
}

export function formatKpiAnnualRevisionTag(prefix: string | null | undefined, revisionNo: number): string {
  return `${normalizeKpiAnnualPrefix(prefix)} Rev.${Math.max(0, revisionNo).toString().padStart(2, "0")}`;
}
