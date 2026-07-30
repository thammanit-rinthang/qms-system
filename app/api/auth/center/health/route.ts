import { NextResponse } from "next/server";
import { verifyAuthCenterToken } from "@/lib/auth-center-token";

/**
 * Auth Center integration health check.
 * GET  /api/auth/center/health          — check JWKS reachability
 * POST /api/auth/center/health  { token } — verify a token and return claims (dev only)
 *
 * Used for Phase 11 regression: Task 11.1 login and session tests.
 */

export async function GET() {
  const jwksUrl = process.env.AUTH_CENTER_JWKS_URL;
  const authCenterUrl = process.env.AUTH_CENTER_URL;
  const appId = process.env.AUTH_CENTER_APP_ID ?? "qms";

  const result: Record<string, unknown> = {
    authMode: "auth_center",
    appId,
    authCenterUrl: authCenterUrl ?? null,
    jwksUrl: jwksUrl ?? null,
    jwksReachable: false,
    issuerReachable: false,
  };

  // Check JWKS endpoint
  if (jwksUrl) {
    try {
      const res = await fetch(jwksUrl, { signal: AbortSignal.timeout(5000) });
      const json = await res.json() as { keys?: unknown[] };
      result.jwksReachable = res.ok;
      result.jwksKeyCount = Array.isArray(json.keys) ? json.keys.length : 0;
    } catch (err) {
      result.jwksError = err instanceof Error ? err.message : String(err);
    }
  }

  // Check issuer metadata endpoint
  if (authCenterUrl) {
    try {
      const res = await fetch(`${authCenterUrl}/api/auth/issuer`, {
        signal: AbortSignal.timeout(5000),
      });
      result.issuerReachable = res.ok;
      if (res.ok) result.issuerMeta = await res.json();
    } catch (err) {
      result.issuerError = err instanceof Error ? err.message : String(err);
    }
  }

  const healthy = result.jwksReachable === true;
  return NextResponse.json(result, { status: healthy ? 200 : 503 });
}

export async function POST(req: Request) {
  // Token probe — dev/staging only
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { token?: string; appId?: string };
  if (!body.token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const appId = body.appId ?? process.env.AUTH_CENTER_APP_ID ?? "qms";

  try {
    const claims = await verifyAuthCenterToken(body.token, appId);
    return NextResponse.json({ valid: true, claims });
  } catch (err) {
    return NextResponse.json({
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 401 });
  }
}
