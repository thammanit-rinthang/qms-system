import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import DarReviewLayout from "@/components/dar/DarReviewLayout";
import type { DarApprovalRow } from "@/types/dar";
import { db } from "@/lib/db";

const darService = new DarService();

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const dar = await db.darMaster.findUnique({ where: { id }, select: { darNo: true } });
  return { title: dar?.darNo ? `Review Request ${dar.darNo}` : "Review Request" };
}

export default async function DarReviewPage({ params }: Props) {
  const [session, { id }] = await Promise.all([requireAuth(), params]);
  try {
    const [dar, savedSig] = await Promise.all([
      darService.getDarById(id, { userId: session.user.id, authUserId: session.user.authUserId ?? null }),
      darService.getSavedSignature(session.user.id),
    ]);

    const isAssignedReviewer = dar.approvals.some(
      (a: DarApprovalRow) =>
        a.stepRole === "REVIEWER" &&
        (a.assignedUser.id === session.user.id || a.assignedUser.authUserId === (session.user.authUserId ?? null)) &&
        a.action === "PENDING",
    );

    if (!isAssignedReviewer) {
      redirect(`/dar/${id}`);
    }

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
        <DarReviewLayout
          dar={dar}
          darId={id}
          darNo={dar.darNo}
          currentUserId={session.user.id}
          savedSignatureUrl={savedSig?.url ?? null}
          savedSignatureType={savedSig?.type ?? null}
          isAssignedReviewer={isAssignedReviewer}
        />
      </div>
    );
  } catch (error) {
    const err = error as { statusCode?: number; errorCode?: string; name?: string };
    if (
      err?.name === "ForbiddenError" ||
      err?.statusCode === 403 ||
      err?.errorCode === "FORBIDDEN"
    ) {
      redirect("/dar");
    }
    notFound();
  }
}
