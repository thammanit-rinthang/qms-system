import { requireAuth } from "@/lib/auth";
import KpiObjectivesClient from "@/components/kpi/KpiObjectivesClient";
import { getUserSnapshot } from "@/lib/userSnapshotCache";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "KPI" };

export default async function KpiObjectivesPage() {
  const session = await requireAuth();
  const userId = session?.user?.id ?? "";
  const role = (session?.user?.role ?? "USER") as "USER" | "IT" | "QMS" | "MR";

  // Prefer Auth Center department code. Fallback to snapshot cache.
  let userDepartmentId: string | undefined;
  if (userId) {
    const snapshot = await getUserSnapshot(userId);
    userDepartmentId =
      session?.user?.authDepartmentId
      ?? snapshot?.departmentId
      ?? undefined;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <KpiObjectivesClient
        role={role}
        userId={userId}
        userDepartmentId={userDepartmentId}
      />
    </div>
  );
}
