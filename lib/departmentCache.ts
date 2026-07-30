import { redis } from "@/lib/redis";
import { listAuthCenterDepartments } from "@/lib/auth-center-admin-client";
import type { AuthCenterDepartment } from "@/lib/auth-center-admin-client";
import { UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const CACHE_KEY = "ac:departments";
const CACHE_TTL = 300; // 5 minutes

/**
 * Get departments from Redis cache, or fetch from Auth Center using the
 * provided user access token on cache miss.
 *
 * Pass `accessToken` (session.user.accessToken) from pages/routes.
 * Services that have no session token should call without the arg —
 * they rely on the cache populated by a prior page request.
 */
export async function getDepartments(accessToken?: string | null): Promise<AuthCenterDepartment[]> {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached) as AuthCenterDepartment[];
  } catch { /* Redis unavailable — fall through */ }

  if (!accessToken) {
    // No token and no cache — services cannot fetch without a user token
    logger.warn("[departmentCache] Cache miss with no access token — returning empty list");
    return [];
  }

  let depts: AuthCenterDepartment[];
  try {
    depts = await listAuthCenterDepartments({ accessToken });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      logger.warn("[departmentCache] Auth Center department list unauthorized - returning empty list");
      return [];
    }
    throw error;
  }

  try {
    await redis.set(CACHE_KEY, JSON.stringify(depts), "EX", CACHE_TTL);
  } catch { /* non-fatal */ }

  return depts;
}

export async function getDepartmentByCode(code: string, accessToken?: string | null): Promise<AuthCenterDepartment | null> {
  const depts = await getDepartments(accessToken);
  return depts.find(d => d.code === code || d.displayName === code) ?? null;
}

export async function getDepartmentByName(name: string, accessToken?: string | null): Promise<AuthCenterDepartment | null> {
  const depts = await getDepartments(accessToken);
  return depts.find(
    d => d.displayName.toLowerCase() === name.toLowerCase()
      || d.code.toLowerCase() === name.toLowerCase()
  ) ?? null;
}

export async function invalidateDepartmentCache(): Promise<void> {
  try {
    await redis.del(CACHE_KEY);
  } catch { /* non-fatal */ }
}
