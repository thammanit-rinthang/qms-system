import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { CarService } from "@/services/carService";
import CarDetailClient from "@/components/car/CarDetailClient";
import { ForbiddenError } from "@/errors/customErrors";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "CAR Detail" };

const carService = new CarService();

export default async function UserCarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();

  const { id } = await params;
  let car;
  try {
    car = await carService.getCarById(id);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/car");
    notFound();
  }

  // USER can only view their own department's CARs
  const userDeptId = session.user.authDepartmentId ?? session.user.departmentId ?? null;
  if (
    session.user.role === "USER" &&
    (!userDeptId || !car.targetDepartment?.id || car.targetDepartment.id !== userDeptId)
  ) {
    redirect("/car");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <CarDetailClient
        car={car}
        userRole={session.user.role}
        userId={session.user.id}
        userDepartmentId={session.user.authDepartmentId ?? session.user.departmentId ?? null}
        isPrivileged={false}
        userJobTitle={session.user.jobTitle ?? null}
        listPath="/car"
      />
    </div>
  );
}
