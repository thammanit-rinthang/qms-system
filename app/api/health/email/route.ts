import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { NotificationLogRepository } from "@/repositories/notificationLogRepository";
import { getEmailSendReadiness } from "@/lib/email-health";

const notifLogRepo = new NotificationLogRepository();

export async function GET() {
  try {
    const session = await requireRole("IT", "QMS", "MR");
    const authCenterUrl = process.env.AUTH_CENTER_URL?.trim() ?? "";
    const m2mAppId = process.env.AUTH_CENTER_APP_ID?.trim() || process.env.AUTH_CENTER_CLIENT_ID?.trim();
    const hasM2mCredentials = Boolean(m2mAppId && process.env.AUTH_CENTER_CLIENT_SECRET?.trim());
    const readiness = getEmailSendReadiness({
      authCenterUrl,
      hasSessionToken: Boolean(session.user.accessToken),
      hasM2mCredentials,
    });

    const logs = await notifLogRepo.findRecentLogs("EMAIL", 20);

    const counts = logs.reduce(
      (result, log) => {
        const status = log.status.toLowerCase();
        if (status === "sent") result.sent += 1;
        if (status === "failed") result.failed += 1;
        if (status === "pending") result.pending += 1;
        return result;
      },
      { sent: 0, failed: 0, pending: 0 },
    );

    return NextResponse.json({
      success: true,
      data: {
        probeSent: false,
        readiness,
        configuration: {
          authCenterUrlConfigured: Boolean(authCenterUrl),
          delegatedTokenPresent: Boolean(session.user.accessToken),
          m2mCredentialsConfigured: hasM2mCredentials,
          accessTokenExpiresAt: session.user.accessTokenExpiresAt ?? null,
        },
        recent: {
          window: 20,
          counts,
          logs,
        },
      },
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/health/email", method: "GET" });
  }
}
