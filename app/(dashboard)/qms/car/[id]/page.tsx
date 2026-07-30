import { requireRole } from "@/lib/auth";
import { notFound } from "next/navigation";
import { CarService } from "@/services/carService";
import CarDetailClient from "@/components/car/CarDetailClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "CAR Detail" };

const carService = new CarService();

export default async function QmsCarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("QMS", "IT", "MR");

  const { id } = await params;
  let car;
  try {
    car = await carService.getCarById(id);
  } catch {
    notFound();
  }

  const role = session.user.role;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <CarDetailClient
        car={car}
        userRole={role}
        userId={session.user.id}
        userDepartmentId={session.user.authDepartmentId ?? session.user.departmentId ?? null}
        isPrivileged={role === "QMS" || role === "IT" || role === "MR"}
        userJobTitle={session.user.jobTitle ?? null}
        listPath="/qms/car"
      />
    </div>
  );
}
