import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { encode, getToken } from "next-auth/jwt";

const REFRESH_LEEWAY_SEC = 60 * 15;

function getCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-qms.session-token"
    : "qms.session-token";
}

function getAuthCenterBaseUrl(): string | null {
  const value = process.env.AUTH_CENTER_URL?.trim();
  return value ? value.replace(/\/$/, "") : null;
}

export async function POST(req: NextRequest) {
  const cookieName = getCookieName();
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET!,
    cookieName,
    salt: cookieName,
  });

  const accessToken = typeof token?.accessToken === "string" ? token.accessToken : null;
  const sessionId = typeof token?.jti === "string" ? token.jti : null;
  if (!accessToken || !sessionId) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }

  const rawExpiry = token?.accessTokenExpiresAt;
  const expiryMs = typeof rawExpiry === "string" ? Date.parse(rawExpiry) : Number(rawExpiry);
  const expirySec = Number.isFinite(expiryMs)
    ? (typeof rawExpiry === "string" ? Math.floor(expiryMs / 1000) : Math.floor(expiryMs))
    : 0;
  const nowSec = Math.floor(Date.now() / 1000);

  const baseUrl = getAuthCenterBaseUrl();
  const appId = process.env.AUTH_CENTER_APP_ID?.trim() || "qms";
  if (!baseUrl) {
    return NextResponse.json({ success: false, error: { code: "AUTH_CENTER_NOT_CONFIGURED" } }, { status: 503 });
  }

  if (expirySec > nowSec + REFRESH_LEEWAY_SEC) {
    // ponytail: cheap liveness probe instead of a full refresh, so revocation
    // is caught even when the locally cached expiry still looks valid.
    let meResponse: Response;
    try {
      meResponse = await fetch(`${baseUrl}/api/auth/me?appId=${encodeURIComponent(appId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      return NextResponse.json({
        success: true,
        data: { refreshed: false, expiresAt: new Date(expirySec * 1000).toISOString() },
      });
    }

    if (meResponse.status === 401) {
      return NextResponse.json({ success: false, error: { code: "SESSION_EXPIRED" } }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: { refreshed: false, expiresAt: new Date(expirySec * 1000).toISOString() },
    });
  }

  let refreshResponse: Response;
  try {
    refreshResponse = await fetch(`${baseUrl}/api/auth/refresh?appId=${encodeURIComponent(appId)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ appId, sessionId }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return NextResponse.json({ success: false, error: { code: "AUTH_CENTER_UNAVAILABLE" } }, { status: 503 });
  }

  if (!refreshResponse.ok) {
    return NextResponse.json({ success: false, error: { code: "SESSION_EXPIRED" } }, { status: 401 });
  }

  const body = await refreshResponse.json() as {
    data?: { accessToken?: string; expiresAt?: number };
  };
  const refreshedToken = body.data?.accessToken;
  const refreshedExpiry = body.data?.expiresAt;
  if (!refreshedToken || typeof refreshedExpiry !== "number") {
    return NextResponse.json({ success: false, error: { code: "AUTH_CENTER_INVALID_REFRESH" } }, { status: 502 });
  }

  const maxAge = Math.max(0, refreshedExpiry - nowSec);

  const sessionToken = await encode({
    token: {
      ...token,
      accessToken: refreshedToken,
      accessTokenExpiresAt: new Date(refreshedExpiry * 1000).toISOString(),
    },
    secret: process.env.AUTH_SECRET!,
    salt: cookieName,
    maxAge,
  });

  const cookieStore = await cookies();
  cookieStore.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return NextResponse.json({
    success: true,
    data: { refreshed: true, expiresAt: new Date(refreshedExpiry * 1000).toISOString() },
  });
}
