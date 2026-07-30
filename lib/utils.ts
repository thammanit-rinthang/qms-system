import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes using clsx and tailwind-merge.
 * This ensures that later classes override earlier ones correctly without conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ParsedComment {
  text: string;
  attachments: { fileName: string; spItemId: string; spWebUrl: string }[];
}

export function parseComment(commentStr: string | null | undefined): ParsedComment {
  if (!commentStr) return { text: "", attachments: [] };
  const trimmed = commentStr.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && (typeof parsed.text === "string" || Array.isArray(parsed.attachments))) {
        return {
          text: parsed.text || "",
          attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
        };
      }
    } catch {
      // Fallback to plain text
    }
  }
  return { text: commentStr, attachments: [] };
}
