import { requireRole } from "@/lib/auth";
import { getAuthCenterMe, getAuthCenterUserProfile } from "@/lib/auth-center-admin-client";
import { CarService } from "@/services/carService";
import CarListTable from "@/components/car/CarListTable";
import CarFormModalTrigger from "@/components/car/CarFormModalTrigger";
import PageHeader from "@/components/common/PageHeader";
import { carListQuerySchema } from "@/lib/validations/car";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "CAR - QMS" };

const carService = new CarService();

export default async function QmsCarListPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("QMS", "IT", "MR");
  const role = session.user.role;

  const authUserId = session.user.authUserId ?? session.user.id;
  const authDepartmentId = session.user.authDepartmentId ?? null;
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = carListQuerySchema.parse({
    page: typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined,
    limit: typeof resolvedSearchParams.limit === "string" ? resolvedSearchParams.limit : undefined,
    search: typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : undefined,
    status: typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : undefined,
    sourceType: typeof resolvedSearchParams.sourceType === "string" ? resolvedSearchParams.sourceType : undefined,
    scope: typeof resolvedSearchParams.scope === "string" ? resolvedSearchParams.scope : undefined,
  });
  const scope = query.scope ?? "all";

  const [cars, authProfile] = await Promise.all([
    carService.listCars(query, {
      scope,
      issuerAuthUserId: session.user.id,
      authDepartmentId,
    }),
    authUserId
      ? (session.user.accessToken
          ? getAuthCenterMe(session.user.accessToken)
          : getAuthCenterUserProfile(authUserId))
      : Promise.resolve(null),
  ]);

  const issuerName = authProfile?.displayName ?? session.user.name ?? null;
  const issuerPosition = authProfile?.jobTitle ?? session.user.jobTitle ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="CAR - คำร้องขอแก้ไข"
        subtitle="Corrective Action Requests"
        actions={role === "QMS" || role === "IT" ? <CarFormModalTrigger issuerName={issuerName} defaultIssuerPosition={issuerPosition} /> : undefined}
      />
      <CarListTable
        initialData={cars}
        isPrivileged
        canEditDelete={role === "QMS" || role === "IT"}
        initialScope={scope}
        allowAllScope
        myAuthDeptId={authDepartmentId}
      />
    </div>
  );
}
