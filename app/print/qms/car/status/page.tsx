import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { CarRepository } from "@/repositories/carRepository";
import type { CarStatus } from "@/generated/prisma/client";
import CarStatusPrintTemplate from "@/components/car/CarStatusPrintTemplate";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const carRepository = new CarRepository();

export default async function PrintCarStatusPage({ searchParams }: Props) {
  await requireAuth();

  const resolvedSearchParams = (await searchParams) ?? {};
  const dueFilter = typeof resolvedSearchParams.dueFilter === "string" ? resolvedSearchParams.dueFilter : undefined;
  const status = typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : undefined;

  try {
    const parsedStatus = (status && status !== "all" ? status : undefined) as CarStatus | undefined;

    const data = await carRepository.findStatusReport(dueFilter, parsedStatus);

    const formattedData = data.map((car) => ({
      id: car.id,
      carNo: car.carNo,
      issuedAt: car.issuedAt ? car.issuedAt.toISOString() : null,
      defectDetail: car.defectDetail,
      targetDepartmentName: car.targetDepartmentName,
      responseDueAt: car.responseDueAt ? car.responseDueAt.toISOString() : null,
      followUp: car.followUp,
      closingDate: car.closingDate ? car.closingDate.toISOString() : null,
      status: car.status,
      remark: car.remark,
    }));

    return (
      <CarStatusPrintTemplate
        data={formattedData}
        dueFilter={dueFilter}
        status={status}
      />
    );
  } catch (err) {
    console.error("Print status error", err);
    notFound();
  }
}
