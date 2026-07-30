import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import DistributionPublishWizard from "@/components/distribution/DistributionPublishWizard";

type Props = { params: Promise<{ darId: string }> };

export const metadata = { title: "แจกจ่ายเอกสาร — Publish Distribution" };

export default async function DistributionPublishPage({ params }: Props) {
  await requireRole("QMS", "IT", "MR");
  const { darId } = await params;

  const dar = await db.darMaster.findUnique({
    where: { id: darId },
    select: { id: true, darNo: true, status: true },
  });
  if (!dar) notFound();
  if (dar.status !== "COMPLETED") redirect(`/dar/${darId}`);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6">
      <DistributionPublishWizard darId={dar.id} darNo={dar.darNo} />
    </div>
  );
}
