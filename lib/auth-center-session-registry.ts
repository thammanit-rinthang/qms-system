import type { LegacyQmsRole } from "@/lib/qms-roles";
import { logger } from "@/lib/logger";

export interface AuthCenterSessionRegisterPayload {
  appId: string;
  authUserId: string;
  employeeId: string | null;
  appRoles: string[];
  effectiveRole: LegacyQmsRole;
  sessionId: string;
  loginAt: string;
  lastSeenAt: string;
  expiresAt?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function getAuthCenterBaseUrl(): string | null {
  const url = process.env.AUTH_CENTER_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

function getConsumerAppId(): string {
  return process.env.AUTH_CENTER_CLIENT_ID?.trim() || process.env.AUTH_CENTER_APP_ID?.trim() || "qms";
}

function getConsumerAppSecret(): string | null {
  const secret = process.env.AUTH_CENTER_CLIENT_SECRET?.trim();
  return secret || null;
}

function getRegisterPath(): string {
  return process.env.AUTH_CENTER_SESSION_REGISTER_PATH?.trim() || "/api/internal/consumer-sessions/register";
}

export function isAuthCenterSessionRegistryConfigured(): boolean {
  return Boolean(getAuthCenterBaseUrl() && getConsumerAppSecret());
}

export async function registerAuthCenterSession(
  payload: AuthCenterSessionRegisterPayload,
): Promise<void> {
  const baseUrl = getAuthCenterBaseUrl();
  const appSecret = getConsumerAppSecret();

  if (!baseUrl || !appSecret) {
    logger.info("[auth-center/session-registry] skipped register: configuration missing");
    return;
  }

  const endpoint = `${baseUrl}${getRegisterPath()}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Consumer-App-Id": getConsumerAppId(),
      "X-Consumer-App-Secret": appSecret,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Session register failed (${res.status}): ${text || "Unknown error"}`);
  }
}
