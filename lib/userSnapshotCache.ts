import { redis } from "@/lib/redis";

const CACHE_PREFIX = "user:snapshot:";
const CACHE_TTL_SEC = 2592000; // 30 days

export type UserSnapshot = {
  authUserId: string;
  name: string | null;
  email: string | null;
  employeeId: string | null;
  departmentId: string | null;    // local dept UUID if available, else authDepartmentId
  departmentName: string | null;  // display name from Auth Center
  m365Linked: boolean;
};

export async function setUserSnapshot(authUserId: string, snapshot: UserSnapshot): Promise<void> {
  try {
    await redis.set(`${CACHE_PREFIX}${authUserId}`, JSON.stringify(snapshot), "EX", CACHE_TTL_SEC);
  } catch {
    // Redis unavailable — non-fatal
  }
}

export async function getUserSnapshot(authUserId: string): Promise<UserSnapshot | null> {
  try {
    const cached = await redis.get(`${CACHE_PREFIX}${authUserId}`);
    if (cached) return JSON.parse(cached) as UserSnapshot;
  } catch {
    // Redis unavailable — fall through
  }
  return null;
}

export async function deleteUserSnapshot(authUserId: string): Promise<void> {
  try {
    await redis.del(`${CACHE_PREFIX}${authUserId}`);
  } catch {
    // Non-fatal
  }
}
