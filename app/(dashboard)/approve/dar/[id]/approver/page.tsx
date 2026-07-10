import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import DarReviewLayout from "@/components/dar/DarReviewLayout";
import type { DarApprovalRow } from "@/types/dar";
import { AppError } from "@/errors/customErrors";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "DAR — Approve" };

const darService = new DarService();

export default async function DarApproverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([requireAuth(), params]);

  try {
    const [dar, savedSig] = await Promise.all([
      darService.getDarById(id, session.user.id),
      darService.getSavedSignature(session.user.id),
    ]);

    const isAssigned = dar.approvals.some(
      (a: DarApprovalRow) =>
        (a.stepRole === "APPROVER_MR" || a.stepRole === "QMS_PROCESSOR") &&
        a.assignedUser.id === session.user.id &&
        a.action === "PENDING",
    );

    if (!isAssigned) redirect(`/dar/${id}`);

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
        <DarReviewLayout
          dar={dar}
          darId={id}
          darNo={dar.darNo}
          currentUserId={session.user.id}
          savedSignatureUrl={savedSig?.url ?? null}
          savedSignatureType={savedSig?.type ?? null}
          isAssignedReviewer
          isMrApprove={session.user.role === "MR"}
          redirectToApproveOnAction
        />
      </div>
    );
  } catch (error) {
    if (error instanceof AppError) {
      if (error.statusCode === 403) redirect("/unauthorized?reason=insufficient_role");
      if (error.statusCode === 404) notFound();
    }
    throw error;
  }
}
