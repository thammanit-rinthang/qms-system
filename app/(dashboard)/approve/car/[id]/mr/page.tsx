import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { CarService } from "@/services/carService";
import { UserPreferenceRepository } from "@/repositories/userPreferenceRepository";
import CarMrSignDialog from "@/components/car/CarMrSignDialog";

export const metadata: Metadata = { title: "CAR Sign-off" };

const carService = new CarService();
const userPrefRepo = new UserPreferenceRepository();

export default async function CarMrSignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

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

  const savedSig = authUserId ? await userPrefRepo.findByAuthUserId(authUserId) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6">
      <CarMrSignDialog
        carId={id}
        car={car}
        token={token}
        savedSignatureUrl={savedSig?.savedSignatureUrl ?? null}
        savedSignatureType={savedSig?.signatureType ?? null}
      />
    </div>
  );
}
