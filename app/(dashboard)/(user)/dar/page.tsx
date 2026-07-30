
import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import { DepartmentService } from "@/services/departmentService";
import DarTableSkeleton from "@/components/dar/DarTableSkeleton";
import DarListClient from "@/components/dar/(user)/DarListClient";
import type { DarSummary } from "@/types/dar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Requests",
};

const darService = new DarService();
const deptService = new DepartmentService();

async function DarList({
  requesterId,
  requesterInfo,
}: {
  requesterId: string;
  requesterInfo: {
    name: string | null;
    employeeId: string | null;
    department: string | null;
    requestDate: string;
  };
}) {
  const { dars } = await darService.getDarsByRequesterId(requesterId, 1, 20);

  return <DarListClient dars={dars as DarSummary[]} requesterInfo={requesterInfo} />;
}

export default async function DarPage() {
  const session = await requireAuth();

  let departmentName: string | null = null;
  if (session.user.authDepartmentId || session.user.departmentId) {
    const departments = await deptService.getActiveDepartments(session.user.accessToken);
    departmentName =
      departments.find((d: { id: string; name: string }) => d.id === (session.user.authDepartmentId ?? session.user.departmentId ?? ""))?.name
      ?? null;
  }

  const requesterInfo = {
    name: session.user.name ?? null,
    employeeId: session.user.employeeId ?? null,
    department: departmentName,
    requestDate: new Date().toISOString(),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Suspense fallback={<DarTableSkeleton />}>
        <DarList requesterId={session.user.id} requesterInfo={requesterInfo} />
      </Suspense>
    </div>
  );
}
