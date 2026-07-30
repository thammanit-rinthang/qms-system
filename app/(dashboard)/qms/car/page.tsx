import { requireRole } from "@/lib/auth";
import { getAuthCenterMe, getAuthCenterUserProfile } from "@/lib/auth-center-admin-client";
import { CarService } from "@/services/carService";
import { QmsConfigService } from "@/services/qmsConfigService";
import QmsCarPageClient from "@/components/car/QmsCarPageClient";
import CarFormModalTrigger from "@/components/car/CarFormModalTrigger";
import PageHeader from "@/components/common/PageHeader";
import { carListQuerySchema } from "@/lib/validations/car";
import type { Metadata } from "next";
import { UnauthorizedError } from "@/lib/errors";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "CAR - QMS" };

const carService = new CarService();
const qmsConfigService = new QmsConfigService();

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

  let cars, authProfile, footerConfig;
  try {
    [cars, authProfile, footerConfig] = await Promise.all([
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
      qmsConfigService.getSingleFooterConfig("CAR"),
    ]);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      redirect("/api/auth/signout?callbackUrl=/qms/car");
    }
    throw e;
  }

  const issuerName = authProfile?.displayName ?? session.user.name ?? null;
  const issuerPosition = authProfile?.jobTitle ?? session.user.jobTitle ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="CAR - คำร้องขอแก้ไข"
        subtitle="Corrective Action Requests"
        actions={role === "QMS" || role === "IT" || role === "MR" ? <CarFormModalTrigger issuerName={issuerName} defaultIssuerPosition={issuerPosition} footerConfig={footerConfig} /> : undefined}
      />
      <QmsCarPageClient
        initialData={cars}
        authDepartmentId={authDepartmentId}
        role={role}
        scope={scope}
      />
    </div>
  );
}

