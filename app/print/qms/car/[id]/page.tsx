import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { CarService } from "@/services/carService";
import { QmsConfigService } from "@/services/qmsConfigService";
import CarPrintTemplate from "@/components/car/CarPrintTemplate";
import { db } from "@/lib/db";

const carService = new CarService();
const qmsConfigService = new QmsConfigService();

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const [car, footerConfig] = await Promise.all([
    db.carMaster.findUnique({ where: { id }, select: { carNo: true } }),
    qmsConfigService.getSingleFooterConfig("CAR"),
  ]);

  const label = footerConfig.label.trim() || "Corrective Action Request / Preventive Action (CAR)";
  return { title: car?.carNo ? `${car.carNo} - ${label}` : label };
}

export default async function PrintCarPage({ params }: Props) {
  const [session, { id }] = await Promise.all([requireAuth(), params]);
  // Privileged check similar to DAR or standard check
  void session; // ensure session auth completes successfully

  try {
    const [car, footerConfig] = await Promise.all([
      carService.getCarById(id),
      qmsConfigService.getSingleFooterConfig("CAR"),
    ]);
    return <CarPrintTemplate car={car} footerConfig={footerConfig} />;
  } catch {
    notFound();
  }
}
