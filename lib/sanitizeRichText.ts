// DOM-free rich-text sanitizer — safe in both SSR and the browser (no window/jsdom needed).
// Allowlist-based: unknown tags are escaped to text, allowed tags are re-emitted WITHOUT any
// attributes (so onerror/onclick/style are dropped), and <a href> is scheme-validated.
// Shared by on-screen render sinks (RichTextView, print templates) and the email path.

const RICH_TEXT_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "blockquote", "a",
]);

const VOID_RICH_TEXT_TAGS = new Set(["br"]);

export function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function hasHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

function sanitizeHref(value: string): string | null {
  const trimmed = value.trim();
  // ponytail: allowlist http(s)/mailto/relative only — blocks javascript: and data: URIs
  if (/^(https?:|mailto:|\/)/i.test(trimmed)) return trimmed;
  return null;
}

export function sanitizeRichTextHtml(value: string): string {
  const withoutUnsafeBlocks = value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)[\s\S]*?>[\s\S]*?<\/\1>/gi, "");

  return withoutUnsafeBlocks.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (raw, tagName: string, attrs: string) => {
    const tag = tagName.toLowerCase();
    if (!RICH_TEXT_TAGS.has(tag)) return esc(raw);

    const isClosing = raw.startsWith("</");
    if (isClosing) return VOID_RICH_TEXT_TAGS.has(tag) ? "" : `</${tag}>`;

    if (tag === "a") {
      const hrefMatch = attrs.match(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = sanitizeHref(hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "");
      if (!href) return "<a>";
      return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">`;
    }

    return `<${tag}>`;
  });
}

/** Sanitize rich text for rendering; plain text (no tags) is escaped and newlines preserved via CSS. */
export function renderableRichText(value: string | null | undefined): string {
  if (!value) return "";
  return hasHtml(value) ? sanitizeRichTextHtml(value) : esc(value);
}
