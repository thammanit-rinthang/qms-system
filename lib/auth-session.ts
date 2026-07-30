/**
 * Auth Center access tokens are shorter-lived than the QMS cookie.
 * Keep the comparison in one pure helper so every auth boundary uses the
 * same rule and can be tested without decoding or exposing the token.
 */
export function isAuthCenterAccessTokenExpired(
  expiresAt?: number | string | null,
  nowSeconds = Math.floor(Date.now() / 1000),
  accessToken?: string | null,
): boolean {
  let effectiveExpiry = expiresAt;
  if ((effectiveExpiry === undefined || effectiveExpiry === null || effectiveExpiry === "") && accessToken) {
    try {
      const payload = accessToken.split(".")[1];
      if (payload) {
        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
        const parsed = JSON.parse(atob(padded)) as { exp?: unknown };
        if (typeof parsed.exp === "number" || typeof parsed.exp === "string") effectiveExpiry = parsed.exp;
      }
    } catch {
      // An unreadable legacy token is handled by Auth Center on the next call.
    }
  }

  if (effectiveExpiry === undefined || effectiveExpiry === null || effectiveExpiry === "") return false;

  const expiry = typeof effectiveExpiry === "string" ? Date.parse(effectiveExpiry) / 1000 : effectiveExpiry;
  return !Number.isFinite(expiry) || expiry <= nowSeconds;
}
