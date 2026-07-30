import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { handleAuthCenterCallback } from "@/lib/auth-node";
import { registerAuthCenterSession } from "@/lib/auth-center-session-registry";
import { logger } from "@/lib/logger";

/**
 * Auth Center OAuth callback.
 * Auth Center redirects here with ?token=<jwt>&state=<callbackUrl>
 * We verify the token, resolve the local user, then create a NextAuth session cookie.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const rawToken = searchParams.get("token");
  const state = searchParams.get("state") ?? "/";

  if (!rawToken) {
    logger.warn("[auth-center/callback] missing token param");
    return NextResponse.redirect(new URL("/auth/error?error=MissingToken", req.url));
  }

  try {
    const user = await handleAuthCenterCallback(rawToken);
    const loginAt = new Date().toISOString();

    // Cookie must expire with the Auth Center token, not outlive it.
    const maxAge = Math.max(0, Math.floor((Date.parse(user.expiresAt) - Date.now()) / 1000));

    const isProduction = process.env.NODE_ENV === "production";
    // Must match the cookie name configured in auth.config.ts cookies.sessionToken.name
    const cookieName = isProduction
      ? "__Secure-qms.session-token"
      : "qms.session-token";

    // Build a NextAuth-compatible JWT so the rest of the app (middleware, requireAuth, etc.)
    // works without any changes.
    const sessionToken = await encode({
      token: {
        id: user.authUserId,
        sub: user.authUserId,
        authUserId: user.authUserId,
        email: user.email,
        name: user.name,
        jobTitle: user.jobTitle,
        role: user.role,
        employeeId: user.employeeId,
        departmentId: user.departmentId,
        authDepartmentId: user.authDepartmentId,
        accessToken: rawToken,
        accessTokenExpiresAt: user.expiresAt,
        jti: user.jti,
        m365Linked: user.m365Linked,
        authCenterVerified: true,
      },
      secret: process.env.AUTH_SECRET!,
      salt: cookieName,
      maxAge,
    });

    const cookieStore = await cookies();
    cookieStore.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    try {
      await registerAuthCenterSession({
        appId: process.env.AUTH_CENTER_CLIENT_ID?.trim() || process.env.AUTH_CENTER_APP_ID?.trim() || "qms",
        authUserId: user.authUserId,
        employeeId: user.employeeId,
        appRoles: user.appRoles,
        effectiveRole: user.role,
        sessionId: user.jti,
        loginAt,
        lastSeenAt: loginAt,
        expiresAt: user.expiresAt,
        ipAddress:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
      });
    } catch (err) {
      logger.warn("[auth-center/callback] session registry register failed", {
        error: err instanceof Error ? err.message : String(err),
        sessionId: user.jti,
        authUserId: user.authUserId,
      });
    }

    // Safe same-site redirect only
    // Use NEXTAUTH_URL as base to avoid resolving against 0.0.0.0 (Docker bind address)
    const appBase = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;
    const redirectTo = state.startsWith("/") && !state.startsWith("//") ? state : "/";
    return NextResponse.redirect(new URL(redirectTo, appBase));
  } catch (err) {
    logger.error("[auth-center/callback] token verification failed", err);
    const appBase = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;
    return NextResponse.redirect(new URL("/auth/error?error=AuthCenterTokenInvalid", appBase));
  }
}
