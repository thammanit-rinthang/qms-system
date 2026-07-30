/**
 * QMS module date formatter — formats ISO date strings for CAR, DAR, Audit, KPI.
 * For document-control datetime formatting (DD/MM/YYYY HH:mm), see lib/formatters.ts.
 * Returns "—" for null/undefined/invalid.
 *
 * Accepts a BCP 47 locale tag or the short aliases "th" → "th-TH" and "en" → "en-GB".
 */
export function fmtDate(iso: string | null | undefined, locale = "th-TH"): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const tag = locale === "th" ? "th-TH" : locale === "en" ? "en-GB" : locale;
    return new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(d);
  } catch {
    return "—";
  }
}
