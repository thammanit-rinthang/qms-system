import type { FooterConfig } from "@/services/qmsConfigService";

export function resolvePrintLabel(
  config: FooterConfig | null | undefined,
  fallbackLabel: string,
  fallbackPrefix: string,
) {
  const label = config?.label.trim() || fallbackLabel;
  const prefix = config?.prefix.trim() || fallbackPrefix;
  return {
    label,
    prefix,
    titles: splitBilingualLabel(label),
  };
}

export function splitBilingualLabel(label: string): [string, string] {
  const parts = label
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return [parts[0], parts[1]];
  }

  const single = parts[0] || label.trim() || "QMS Document";
  return [single, single];
}

export function formatThaiDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

export function formatThaiDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

export function joinOrDash(values: Array<string | null | undefined>) {
  const normalized = values.map((value) => value?.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized.join(", ") : "-";
}
