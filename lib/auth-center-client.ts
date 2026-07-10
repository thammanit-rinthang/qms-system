/**
 * Auth Center client helpers for QMS.
 * Builds the login URL that redirects the user to Auth Center's Entra login,
 * then receives the JWT token back at our callback.
 */

function getBaseUrl(): string {
  const url = process.env.AUTH_CENTER_URL;
  if (!url) throw new Error("AUTH_CENTER_URL is not configured");
  return url.replace(/\/$/, "");
}

function getAppId(): string {
  return process.env.AUTH_CENTER_APP_ID ?? "qms";
}

function getCallbackBaseUrl(): string {
  const explicitRedirectUri = process.env.AUTH_CENTER_REDIRECT_URI?.trim();
  if (explicitRedirectUri) {
    const parsed = new URL(explicitRedirectUri);
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  }

  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Build the URL that starts the Auth Center login flow.
 * Auth Center login page will then start the Entra flow and redirect back to
 * `redirectUri` with ?token=<jwt>&state=<state>.
 */
export function buildAuthCenterLoginUrl(opts?: {
  callbackPath?: string;
  state?: string;
}): string {
  const base = getBaseUrl();
  const appId = getAppId();
  const redirectUri =
    process.env.AUTH_CENTER_REDIRECT_URI?.trim() ||
    `${getCallbackBaseUrl()}${opts?.callbackPath ?? "/api/auth/center/callback"}`;

  const url = new URL(`${base}/auth/login`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  if (opts?.state) url.searchParams.set("state", opts.state);

  return url.toString();
}

/** Auth Center issuer string — used to verify token `iss` claim. */
export const AUTH_CENTER_ISSUER = "auth-center";

/** Auth Center app ID registered for QMS. */
export function getAuthCenterAppId(): string {
  return getAppId();
}
