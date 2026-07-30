import { requireAuth } from "@/lib/auth";
import { getAuthCenterMe, getAuthCenterUserProfile } from "@/lib/auth-center-admin-client";
import { UserPreferenceRepository } from "@/repositories/userPreferenceRepository";
import { DepartmentService } from "@/services/departmentService";
import { getUserSnapshot } from "@/lib/userSnapshotCache";
import { t } from "@/lib/i18n";
import PageHeader from "@/components/common/PageHeader";
import ProfileClient from "@/components/profile/ProfileClient";
import type { Metadata } from "next";
import { UnauthorizedError } from "@/lib/errors";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "My Profile",
};

const userPrefRepo = new UserPreferenceRepository();
const deptService = new DepartmentService();

export default async function ProfilePage() {
  const session = await requireAuth();
  const authUserId = session.user.authUserId ?? session.user.id;
  
  let departments, authProfile, userPref, snapshot;
  try {
    [departments, authProfile, userPref, snapshot] = await Promise.all([
      deptService.getActiveDepartments(session.user.accessToken),
      authUserId
        ? (session.user.accessToken
            ? getAuthCenterMe(session.user.accessToken)
            : getAuthCenterUserProfile(authUserId))
        : Promise.resolve(null),
      userPrefRepo.findByAuthUserId(session.user.id),
      getUserSnapshot(session.user.id),
    ]);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      redirect("/api/auth/signout?callbackUrl=/profile");
    }
    throw e;
  }

  const authDepartmentId = session.user.authDepartmentId ?? null;
  const departmentName = authDepartmentId
    ? departments.find((d: { id: string; name: string }) => d.id === authDepartmentId)?.name
        ?? authProfile?.department
        ?? null
    : authProfile?.department ?? snapshot?.departmentName ?? null;

  const profile = {
    id: session.user.id,
    name: authProfile?.displayName ?? snapshot?.name ?? null,
    email: authProfile?.email ?? snapshot?.email ?? "",
    employeeId: authProfile?.employeeId ?? snapshot?.employeeId ?? null,
    position: authProfile?.jobTitle ?? null,
    departmentId: authDepartmentId ?? snapshot?.departmentId ?? null,
    savedSignatureUrl: userPref?.savedSignatureUrl ?? null,
    signatureType: userPref?.signatureType ?? null,
    image: null,
    role: session.user.role,
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8">
      <PageHeader
        title={t("profile.title", "th")}
        subtitle={t("profile.subtitle", "th")}
      />
      <ProfileClient profile={profile} departmentName={departmentName} />
    </div>
  );
}

