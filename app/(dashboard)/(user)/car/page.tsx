import { requireAuth } from "@/lib/auth";
import { getAuthCenterMe, getAuthCenterUserProfile } from "@/lib/auth-center-admin-client";
// ponytail: getAuthCenterMe still used when token is fresh; session.user.jobTitle is the stable fallback
import { CarService } from "@/services/carService";
import CarListTable from "@/components/car/CarListTable";
import AllDeptCarSection from "@/components/car/AllDeptCarSection";
import CarFormModalTrigger from "@/components/car/CarFormModalTrigger";
import PageHeader from "@/components/common/PageHeader";
import { carListQuerySchema } from "@/lib/validations/car";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "CAR ของแผนก" };

const carService = new CarService();

export default async function UserCarListPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAuth();

  const authDepartmentId = session.user.authDepartmentId ?? null;
  const hasScope = Boolean(authDepartmentId);
  const authUserId = session.user.authUserId ?? session.user.id;
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = carListQuerySchema.parse({
    page: typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined,
    limit: typeof resolvedSearchParams.limit === "string" ? resolvedSearchParams.limit : undefined,
    search: typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : undefined,
    status: typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : undefined,
    sourceType: typeof resolvedSearchParams.sourceType === "string" ? resolvedSearchParams.sourceType : undefined,
    scope: typeof resolvedSearchParams.scope === "string" ? resolvedSearchParams.scope : undefined,
  });
  const scope = query.scope === "all" ? "my-department" : (query.scope ?? "my-department");

  const [cars, carsAll, authProfile] = await Promise.all([
    hasScope
      ? carService.listCars(query, {
          scope,
          issuerAuthUserId: session.user.id,
          authDepartmentId,
        })
      : Promise.resolve(undefined),
    carService.listCars({ page: 1, limit: 20 }, { scope: "all" }),
    authUserId
      ? (session.user.accessToken
          ? getAuthCenterMe(session.user.accessToken)
          : getAuthCenterUserProfile(authUserId))
      : Promise.resolve(null),
  ]);

  const issuerName = authProfile?.displayName ?? session.user.name ?? null;
  // ponytail: jobTitle baked into session at login — no separate API call needed
  const issuerPosition = authProfile?.jobTitle ?? session.user.jobTitle ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="CAR ของแผนก"
        subtitle="Corrective Action Requests สำหรับแผนกของคุณ"
        actions={hasScope ? <CarFormModalTrigger issuerName={issuerName} defaultIssuerPosition={issuerPosition} /> : undefined}
      />
      {!hasScope || !cars ? (
        <p className="text-sm text-gray-500">บัญชีของคุณยังไม่ได้ผูกกับแผนก</p>
      ) : (
        <CarListTable
          initialData={cars}
          isPrivileged={false}
          initialScope={scope}
          allowAllScope={false}
          myAuthDeptId={authDepartmentId}
        />
      )}

      <div className="mt-10">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800">CAR ทั้งหมด</h2>
          <p className="text-sm text-slate-500">Corrective Action Requests จากทุกแผนก</p>
        </div>
        <AllDeptCarSection initialData={carsAll} />
      </div>
    </div>
  );
}
