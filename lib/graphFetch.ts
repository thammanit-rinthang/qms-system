/**
 * Resilient Microsoft Graph API fetch wrapper.
 *
 * Features:
 *   - AbortController timeout (default 30s) so slow Graph calls do not hang
 *   - Retry on 429 (Too Many Requests), 502, 503, 504 up to MAX_RETRIES times
 *   - Respects `Retry-After` header (seconds or HTTP-date) on 429 responses
 *   - Exponential backoff capped at MAX_BACKOFF_MS for non-429 retryable errors
 *
 * Usage:
 *   import { graphFetch } from "@/lib/graphFetch";
 *   const res = await graphFetch(url, { headers: { Authorization: `Bearer ${token}` } });
 */

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 8_000;

/** HTTP status codes that warrant a retry. */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

/**
 * Parse the Retry-After header into milliseconds.
 * The header may be a number of seconds (e.g., "60") or an HTTP-date string.
 */
function parseRetryAfterMs(header: string | null): number {
  if (!header) return 0;
  const seconds = Number(header);
  if (!isNaN(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, 60_000); // cap at 60s
  }
  // HTTP-date format
  const date = new Date(header);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }
  return 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A resilient fetch wrapper for Microsoft Graph API calls.
 * Adds a request timeout and retries on transient errors.
 */
export async function graphFetch(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchInit } = init;

  let lastErr: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...fetchInit, signal: controller.signal });
      clearTimeout(timer);

      if (!RETRYABLE_STATUSES.has(res.status)) {
        // Success or a non-retryable error — return immediately
        return res;
      }

      // Retryable status — compute delay before next attempt
      if (attempt === MAX_RETRIES) {
        // Exhausted retries — return the last response so callers can read the error body
        return res;
      }

      let delayMs: number;
      if (res.status === 429) {
        // Prefer Retry-After header; fall back to exponential backoff
        const retryAfter = parseRetryAfterMs(res.headers.get("Retry-After"));
        delayMs = retryAfter > 0 ? retryAfter : Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
      } else {
        delayMs = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
      }

      console.warn(`[graphFetch] Retryable ${res.status} from ${url}. Attempt ${attempt + 1}/${MAX_RETRIES}. Waiting ${delayMs}ms.`);
      await sleep(delayMs);
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;

      // AbortError = timeout; network errors are also retryable
      if (attempt === MAX_RETRIES) break;

      const delayMs = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      console.warn(`[graphFetch] ${isTimeout ? "Timeout" : "Network error"} on ${url}. Attempt ${attempt + 1}/${MAX_RETRIES}. Waiting ${delayMs}ms.`, err);
      await sleep(delayMs);
    }
  }

  throw lastErr ?? new Error(`graphFetch: all ${MAX_RETRIES} retries exhausted for ${url}`);
}
