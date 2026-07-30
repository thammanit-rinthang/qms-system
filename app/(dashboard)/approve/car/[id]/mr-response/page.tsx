import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { CarService } from "@/services/carService";
import { UserPreferenceRepository } from "@/repositories/userPreferenceRepository";
import CarMrResponseReviewPanel from "@/components/car/CarMrResponseReviewPanel";
import CarStatusBadge from "@/components/car/CarStatusBadge";
import ApproveSuccessCard from "@/components/shared/ApproveSuccessCard";

export const metadata: Metadata = { title: "CAR Plan Review" };

const carService = new CarService();
const userPrefRepo = new UserPreferenceRepository();

export default async function CarMrResponseReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; action?: string }>;
}) {
  const { id } = await params;
  const { token, action } = await searchParams;

  let authUserId: string | undefined;
  if (!token) {
    const session = await requireAuth();
    if (session.user.role !== "MR") notFound();
    authUserId = session.user.authUserId ?? undefined;
  }

  let car;
  try {
    car = await carService.getCarById(id);
  } catch {
    notFound();
  }

  if (car.status !== "RESPONDED") {
    const isAlreadyReviewed = !!car.mrResponseReview;
    return (
      <ApproveSuccessCard
        action={isAlreadyReviewed ? "approved" : "done"}
        title={isAlreadyReviewed ? "ตรวจสอบเรียบร้อยแล้ว" : "CAR ยังไม่พร้อมสำหรับการตรวจสอบ"}
        description={isAlreadyReviewed ? `CAR ${car.carNo} ได้รับการตรวจสอบแล้ว` : `สถานะปัจจุบัน: ${car.status}`}
        badge={<CarStatusBadge status={car.status} />}
        backHref="/notifications"
        backLabel="กลับหน้าหลัก"
      />
    );
  }

  const savedSig = authUserId ? await userPrefRepo.findByAuthUserId(authUserId) : null;
  const defaultAction = action === "APPROVED" || action === "REJECTED" ? action : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6">
      <CarMrResponseReviewPanel
        carId={id}
        car={car}
        token={token}
        defaultAction={defaultAction}
        savedSignatureUrl={savedSig?.savedSignatureUrl ?? null}
        savedSignatureType={savedSig?.signatureType ?? null}
      />
    </div>
  );
}
