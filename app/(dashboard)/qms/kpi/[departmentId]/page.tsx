import { requireAuth } from "@/lib/auth";
import type { Metadata } from "next";
import KpiDepartmentDetailClient from "@/components/kpi/KpiDepartmentDetailClient";
import { DepartmentService } from "@/services/departmentService";
import { getUserSnapshot } from "@/lib/userSnapshotCache";

export const metadata: Metadata = { title: "KPI Objectives" };

interface Props {
  params: Promise<{ departmentId: string }>;
}

export default async function KpiDepartmentPage({ params }: Props) {
  const { departmentId } = await params;
  const session = await requireAuth();
  const role = session.user.role as "USER" | "IT" | "QMS" | "MR";
  const snapshot = await getUserSnapshot(session.user.id).catch(() => null);

  // Resolve user's department name for USER-level access gating
  let userDepartmentName: string | null = snapshot?.departmentName ?? null;
  if (session.user.authDepartmentId || session.user.departmentId) {
    const deptService = new DepartmentService();
    const depts = await deptService.getActiveDepartments(session.user.accessToken).catch(() => []);
    userDepartmentName =
      depts.find((d) => d.id === (session.user.authDepartmentId ?? session.user.departmentId ?? ""))?.name
      ?? userDepartmentName;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <KpiDepartmentDetailClient
        kpiId={departmentId}
        role={role}
        userId={session?.user?.id ?? null}
        authUserId={session?.user?.authUserId ?? null}
        userDepartmentName={userDepartmentName}
      />
    </div>
  );
}
