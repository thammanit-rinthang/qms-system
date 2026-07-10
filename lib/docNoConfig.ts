/**
 * Document number format engine.
 *
 * Format string tokens:
 *   {PREFIX}       — literal prefix stored in config (e.g. "DAR", "C", "APPT")
 *   {DEPT}         — department short code (only for DAR; empty string for other modules)
 *   {YEAR:YY}      — last 2 digits of current year  e.g. "26"
 *   {YEAR:YYYY}    — full 4-digit year               e.g. "2026"
 *   {SEQ:N}        — running sequence padded to N digits e.g. {SEQ:4} → "0001"
 *
 * Any literal text outside tokens is preserved verbatim (including separators).
 * Example formats:
 *   DAR-{DEPT}-{SEQ:4}            → DAR-PD-0001
 *   C{YEAR:YY}-{SEQ:3}            → C26-001
 *   APPT-{YEAR:YY}-{SEQ:3}        → APPT-26-001
 *   {PREFIX}-{DEPT}-{YEAR:YY}-{SEQ:4} → DAR-PD-26-0001
 */

import { db } from "@/lib/db";

export type DocNoModule = "DAR" | "CAR" | "AUDIT_APPT" | "AUDIT_PLAN";

const DEFAULTS: Record<DocNoModule, string> = {
  DAR:        "DAR-{DEPT}-{SEQ:4}",
  CAR:        "C{YEAR:YY}-{SEQ:3}",
  AUDIT_APPT: "APPT-{YEAR:YY}-{SEQ:3}",
  AUDIT_PLAN: "AUD-{YEAR:YY}-{SEQ:3}",
};

export async function getDocNoFormat(module: DocNoModule): Promise<string> {
  try {
    const row = await db.systemConfig.findUnique({ where: { configKey: `DOC_NO_${module}_FORMAT` } });
    return row?.configValue ?? DEFAULTS[module];
  } catch {
    return DEFAULTS[module];
  }
}

export async function saveDocNoFormat(module: DocNoModule, format: string): Promise<void> {
  await db.systemConfig.upsert({
    where:  { configKey: `DOC_NO_${module}_FORMAT` },
    update: { configValue: format },
    create: { configKey: `DOC_NO_${module}_FORMAT`, configValue: format },
  });
}

/** Extract the SEQ padding from a format string, e.g. "{SEQ:4}" → 4 */
export function extractPad(format: string): number {
  const m = format.match(/\{SEQ:(\d+)\}/);
  return m ? Number(m[1]) : 4;
}

/** True if the format string contains {DEPT} */
export function hasDept(format: string): boolean {
  return format.includes("{DEPT}");
}

/**
 * Build the static prefix used in SQL LIKE queries.
 * Everything up to (but not including) {SEQ:N} after substituting known tokens.
 * Returns the prefix string and the SEQ pad width.
 */
export function buildLikePrefix(
  format: string,
  opts: { prefix?: string; dept?: string; year?: number },
): { likePrefix: string; pad: number } {
  const year = opts.year ?? new Date().getFullYear();
  const yy   = String(year).slice(-2);
  const yyyy = String(year);

  // Substitute everything except {SEQ:N}
  const substituted = format
    .replace(/\{PREFIX\}/g, opts.prefix ?? "")
    .replace(/\{DEPT\}/g,   opts.dept   ?? "")
    .replace(/\{YEAR:YYYY\}/g, yyyy)
    .replace(/\{YEAR:YY\}/g,   yy);

  // Split at {SEQ:N} — take the left part as the prefix
  const seqMatch = substituted.match(/^(.*)\{SEQ:(\d+)\}(.*)$/);
  if (!seqMatch) {
    // No SEQ token — treat whole string as prefix (shouldn't happen with valid format)
    return { likePrefix: substituted, pad: 4 };
  }
  const pad = Number(seqMatch[2]);
  return { likePrefix: seqMatch[1], pad };
}

/**
 * Render the final document number by substituting all tokens including {SEQ:N}.
 */
export function renderDocNo(
  format: string,
  opts: { prefix?: string; dept?: string; year?: number; seq: number },
): string {
  const { likePrefix, pad } = buildLikePrefix(format, opts);
  const seqStr = String(opts.seq).padStart(pad, "0");
  // Re-substitute SEQ in the full string after the prefix
  return format
    .replace(/\{PREFIX\}/g, opts.prefix ?? "")
    .replace(/\{DEPT\}/g,   opts.dept   ?? "")
    .replace(/\{YEAR:YYYY\}/g, String(opts.year ?? new Date().getFullYear()))
    .replace(/\{YEAR:YY\}/g,   String(opts.year ?? new Date().getFullYear()).slice(-2))
    .replace(/\{SEQ:\d+\}/g, seqStr);
  void likePrefix; // used for LIKE queries, not here
}

/** Validate a format string — must contain {SEQ:N} */
export function validateFormat(format: string): string | null {
  if (!format.trim()) return "กรุณากรอก format";
  if (!/\{SEQ:\d+\}/.test(format)) return "format ต้องมี {SEQ:N} เช่น {SEQ:4}";
  return null;
}
