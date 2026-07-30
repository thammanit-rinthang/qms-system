import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getToken } from "next-auth/jwt";
import { isJwtBlocked } from "@/lib/jwt-blocklist";
import { buildAuthCenterLoginUrl } from "@/lib/auth-center-client";
import { hasQmsRole, type LegacyQmsRole } from "@/lib/qms-roles";
import { isAuthCenterAccessTokenExpired } from "@/lib/auth-session";

// ioredis requires Node.js TCP sockets and cannot run in Edge Runtime.
export const runtime = "nodejs";

const { auth } = NextAuth(authConfig);

const AUTH_LIMIT = { limit: 60, windowMs: 60_000 };
const API_LIMIT = { limit: 300, windowMs: 60_000 };

const PUBLIC_PATHS = ["/auth/login", "/auth/error", "/unauthorized"];
const PUBLIC_API_PATHS = [
  "/api/health",
  "/api/health/live",
  "/api/health/ready",
];

function isPublicApiPath(path: string): boolean {
  return path === "/api/health" ||
    path === "/api/health/live" ||
    path === "/api/health/ready" ||
    path.startsWith("/api/cron/");
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function withRequestId(res: NextResponse, requestId: string): NextResponse {
  res.headers.set("X-Request-Id", requestId);
  return res;
}

function tooManyRequests(resetAt: number, requestId: string): NextResponse {
  return withRequestId(
    NextResponse.json(
      { data: null, error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
      },
    ),
    requestId,
  );
}

function logRequest(method: string, path: string, status: number, ip: string, requestId: string, userId?: string): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "info",
    message: "http_request",
    method,
    path,
    status,
    ip,
    requestId,
    ...(userId ? { userId } : {}),
  }));
}

export default auth(async (req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const path = nextUrl.pathname;
  const ip = getClientIp(req);
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  if (path.startsWith("/api/")) {
    // These handlers authenticate independently: health probes are public and
    // cron endpoints use their own bearer secret. They must not require a
    // browser session or consume the normal API rate-limit bucket.
    if (PUBLIC_API_PATHS.includes(path) || isPublicApiPath(path)) {
      logRequest(req.method, path, 200, ip, requestId);
      return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
    }

    // API consumers (including PDF iframes) must receive a machine-readable
    // 401 instead of being redirected to the app root/Auth Center HTML page.
    if (!session?.user) {
      logRequest(req.method, path, 401, ip, requestId);
      return withRequestId(
        NextResponse.json(
          { success: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
          { status: 401 },
        ),
        requestId,
      );
    }

    if (
      path !== "/api/auth/signout" &&
      isAuthCenterAccessTokenExpired(session.user.accessTokenExpiresAt, undefined, session.user.accessToken)
    ) {
      logRequest(req.method, path, 401, ip, requestId, session.user.id);
      return withRequestId(
        NextResponse.json(
          {
            success: false,
            error: {
              message: "เซสชันหมดอายุแล้ว กรุณาออกจากระบบและเข้าสู่ระบบใหม่ / Your session has expired. Please sign out and sign in again.",
              code: "SESSION_EXPIRED",
            },
          },
          { status: 401 },
        ),
        requestId,
      );
    }

    // ponytail: /api/auth/session is a read-only JWT decode hit on every tab focus — no brute-force risk, skip rate limit
    if (path === "/api/auth/session") {
      logRequest(req.method, path, 200, ip, requestId, session?.user?.id);
      return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
    }

    const config = path.startsWith("/api/auth") ? AUTH_LIMIT : API_LIMIT;
    let rateLimitKey = `api:ip:${ip}:${path}`;

    if (!path.startsWith("/api/auth")) {
      const isProduction = process.env.NODE_ENV === "production";
      const cookieName = isProduction ? "__Secure-qms.session-token" : "qms.session-token";
      const token = await getToken({ req, secret: process.env.AUTH_SECRET!, cookieName, salt: cookieName });
      if (token?.sub) rateLimitKey = `api:user:${token.sub}:${path}`;
    }

    const result = await rateLimit(rateLimitKey, config);
    if (!result.allowed) {
      logRequest(req.method, path, 429, ip, requestId, session?.user?.id);
      return tooManyRequests(result.resetAt, requestId);
    }

    logRequest(req.method, path, 200, ip, requestId, session?.user?.id);
    const res = ["GET", "HEAD"].includes(req.method)
      ? NextResponse.next({ request: { headers: requestHeaders } })
      : NextResponse.next();
    res.headers.set("X-RateLimit-Limit", String(result.limit));
    res.headers.set("X-RateLimit-Remaining", String(result.remaining));
    return withRequestId(res, requestId);
  }

  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    if (
      session?.user &&
      path === "/auth/login" &&
      !isAuthCenterAccessTokenExpired(session.user.accessTokenExpiresAt, undefined, session.user.accessToken)
    ) {
      return withRequestId(NextResponse.redirect(new URL("/", req.url)), requestId);
    }
    const res = ["GET", "HEAD"].includes(req.method)
      ? NextResponse.next({ request: { headers: requestHeaders } })
      : NextResponse.next();
    return withRequestId(res, requestId);
  }

  if (!session?.user) {
    logRequest(req.method, path, 401, ip, requestId);
    const callbackPath = path + nextUrl.search;
    const loginUrl = buildAuthCenterLoginUrl({ state: callbackPath });
    return withRequestId(NextResponse.redirect(loginUrl), requestId);
  }

  if (isAuthCenterAccessTokenExpired(session.user.accessTokenExpiresAt, undefined, session.user.accessToken)) {
    logRequest(req.method, path, 401, ip, requestId, session.user.id);
    const signOutUrl = new URL("/api/auth/signout", req.url);
    signOutUrl.searchParams.set("callbackUrl", `/auth/login?callbackUrl=${encodeURIComponent(path + nextUrl.search)}`);
    return withRequestId(NextResponse.redirect(signOutUrl), requestId);
  }

  const jti = session.user.jti;
  if (jti && (await isJwtBlocked(jti))) {
    logRequest(req.method, path, 401, ip, requestId, session?.user?.id);
    const loginUrl = buildAuthCenterLoginUrl({ state: path + nextUrl.search });
    return withRequestId(NextResponse.redirect(loginUrl), requestId);
  }

  const role = (session.user.role ?? "USER") as LegacyQmsRole;

  if (path.startsWith("/it/") && !hasQmsRole(role, "IT", "QMS_IT")) {
    return withRequestId(
      NextResponse.redirect(new URL("/unauthorized?reason=insufficient_role", req.url)),
      requestId,
    );
  }

  if (
    (path.startsWith("/qms/system-info") || path.startsWith("/qms/development")) &&
    !hasQmsRole(role, "IT", "QMS_IT")
  ) {
    return withRequestId(
      NextResponse.redirect(new URL("/unauthorized?reason=insufficient_role", req.url)),
      requestId,
    );
  }

  if (
    path.startsWith("/qms/") &&
    !path.startsWith("/qms/distribution") &&
    !path.startsWith("/qms/document-controls") &&
    !path.startsWith("/qms/kpi") &&
    !hasQmsRole(role, "QMS", "MR", "IT", "QMS_QMS", "QMS_MR", "QMS_IT")
  ) {
    return withRequestId(
      NextResponse.redirect(new URL("/unauthorized?reason=insufficient_role", req.url)),
      requestId,
    );
  }

  logRequest(req.method, path, 200, ip, requestId, session?.user?.id);
  const res = ["GET", "HEAD"].includes(req.method)
    ? NextResponse.next({ request: { headers: requestHeaders } })
    : NextResponse.next();
  return withRequestId(res, requestId);
});

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|api/auth/center/callback|api/sharepoint/upload-file|api/sharepoint/preview-file|api/distribution/[^/]+/preview|api/dar/attachments/temp|api/announcements|api/audit/attachments/upload|api/audit/schedules/[^/]+/submit-checklist|api/car/response/[^/]+/attachments|api/dar/[^/]+/attachments|api/document-controls/[^/]+/upload|api/kpi/[^/]+/monthly/[^/]+/attachment|.*\\.png|.*\\.webp|.*\\.jpg|.*\\.jpeg|.*\\.svg).*)",
};
