function summarizeTextBody(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.slice(0, 240);
}

function buildNonJsonMessage(res: Response, text: string, fallback: string): string {
  const summary = summarizeTextBody(text);
  const looksHtml = /^<!doctype html/i.test(summary) || /^<html/i.test(summary) || summary.includes("<!DOCTYPE html");

  if (looksHtml) {
    return `Request failed with ${res.status} ${res.statusText}. Server returned HTML instead of JSON. This usually means the session expired, access was denied, or an upstream proxy returned an error page.`;
  }

  return summary || fallback;
}

export async function readApiJson<T>(res: Response, fallback = "Request failed"): Promise<T> {
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "";
  const looksJson = contentType.includes("application/json") || /^[\s]*[{[]/.test(text);

  if (!looksJson) {
    throw new Error(buildNonJsonMessage(res, text, fallback));
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(buildNonJsonMessage(res, text, fallback));
  }
}

export async function readApiErrorMessage(res: Response, fallback = "Request failed"): Promise<string> {
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "";
  const looksJson = contentType.includes("application/json") || /^[\s]*[{[]/.test(text);

  if (looksJson) {
    try {
      const json = JSON.parse(text) as {
        error?: string | { message?: string };
        message?: string;
      };

      if (typeof json.error === "string" && json.error.trim()) return json.error;
      if (json.error && typeof json.error === "object" && typeof json.error.message === "string") return json.error.message;
      if (typeof json.message === "string" && json.message.trim()) return json.message;
    } catch {
      // Fall through to raw body summary.
    }
  }

  return buildNonJsonMessage(res, text, fallback);
}
