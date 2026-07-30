"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { sanitizeRichTextHtml } from "@/lib/sanitizeRichText";

interface RichTextViewProps {
  content: string | null | undefined;
  className?: string;
  style?: CSSProperties;
}

/**
 * Detects whether a string contains HTML tags.
 * Used to decide whether to render with dangerouslySetInnerHTML (Tiptap HTML)
 * or as plain pre-wrap text (legacy data before WYSIWYG migration).
 */
function isHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

export default function RichTextView({ content, className, style }: RichTextViewProps) {
  if (!content) return <span className="text-slate-400">-</span>;

  if (isHtml(content)) {
    return (
      <div
        className={cn("rich-view text-sm text-slate-800", className)}
        style={style}
        dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(content) }}
      />
    );
  }

  // Legacy plain-text fallback — preserve newlines
  return (
    <p className={cn("text-sm text-slate-800 whitespace-pre-wrap", className)} style={style}>
      {content}
    </p>
  );
}
