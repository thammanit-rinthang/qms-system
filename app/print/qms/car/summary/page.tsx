import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { CarRepository } from "@/repositories/carRepository";
import type { CarStatus } from "@/generated/prisma/client";
import CarSummaryPrintTemplate from "@/components/car/CarSummaryPrintTemplate";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const carRepository = new CarRepository();

export default async function PrintCarSummaryPage({ searchParams }: Props) {
  await requireAuth();

  const resolvedSearchParams = (await searchParams) ?? {};
  const year = typeof resolvedSearchParams.year === "string" ? resolvedSearchParams.year : undefined;
  const department = typeof resolvedSearchParams.department === "string" ? resolvedSearchParams.department : undefined;
  const status = typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : undefined;

  try {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    const parsedStatus = status as CarStatus | undefined;

    const filteredData = await carRepository.findSummaryReport(parsedYear, department, parsedStatus);

    let selectedDepartmentName = "";
    if (department && filteredData.length > 0) {
      const match = filteredData.find(
        (row) =>
          row.departmentId === department ||
          row.departmentName.toLowerCase().includes(department.toLowerCase())
      );
      if (match) {
        selectedDepartmentName = match.departmentName;
      }
    }

    return (
      <CarSummaryPrintTemplate
        data={filteredData}
        year={year}
        departmentName={selectedDepartmentName || department}
        status={status}
      />
    );
  } catch (err) {
    console.error("Print summary error", err);
    notFound();
  }
}
