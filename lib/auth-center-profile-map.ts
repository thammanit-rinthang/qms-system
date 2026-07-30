import { getAuthCenterUserProfile } from "@/lib/auth-center-admin-client";

export type AuthCenterProfileSnapshot = {
  displayName: string | null;
  department: string | null;
  jobTitle: string | null;
};

export async function getAuthCenterProfileMap(
  authUserIds: Array<string | null | undefined>,
  accessToken?: string | null,
): Promise<Map<string, AuthCenterProfileSnapshot>> {
  const uniqueIds = [...new Set(authUserIds.filter(Boolean))] as string[];
  const profiles = new Map<string, AuthCenterProfileSnapshot>();

  if (!accessToken || uniqueIds.length === 0) {
    return profiles;
  }

  await Promise.all(
    uniqueIds.map(async (authUserId) => {
      const profile = await getAuthCenterUserProfile(authUserId, { accessToken }).catch(() => null);
      profiles.set(authUserId, {
        displayName: profile?.displayName ?? null,
        department: profile?.department ?? null,
        jobTitle: profile?.jobTitle ?? null,
      });
    }),
  );

  return profiles;
}
