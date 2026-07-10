import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getToken } from "next-auth/jwt";
import { isJwtBlocked } from "@/lib/jwt-blocklist";
import { buildAuthCenterLoginUrl } from "@/lib/auth-center-client";
import { hasQmsRole, type LegacyQmsRole } from "@/lib/qms-roles";

// ioredis requires Node.js TCP sockets and cannot run in Edge Runtime.
export const runtime = "nodejs";

const { auth } = NextAuth(authConfig);

const AUTH_LIMIT = { limit: 60, windowMs: 60_000 };
const API_LIMIT = { limit: 300, windowMs: 60_000 };

const PUBLIC_PATHS = ["/auth/login", "/auth/error", "/unauthorized"];

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
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("X-RateLimit-Limit", String(result.limit));
    res.headers.set("X-RateLimit-Remaining", String(result.remaining));
    return withRequestId(res, requestId);
  }

  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    if (session?.user && path === "/auth/login") {
      return withRequestId(NextResponse.redirect(new URL("/", req.url)), requestId);
    }
    return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
  }

  if (!session?.user) {
    logRequest(req.method, path, 401, ip, requestId);
    const callbackPath = path + nextUrl.search;
    const loginUrl = buildAuthCenterLoginUrl({ state: callbackPath });
    return withRequestId(NextResponse.redirect(loginUrl), requestId);
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
    path.startsWith("/qms/") &&
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
  return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
});

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.webp|.*\\.jpg|.*\\.jpeg|.*\\.svg).*)",
};
