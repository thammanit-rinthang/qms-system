import { notFound, redirect, unstable_rethrow } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import DarReadOnlyDetail from "@/components/dar/DarReadOnlyDetail";
import DarDetailBreadcrumb from "@/components/dar/DarDetailBreadcrumb";
import type { DarApprovalRow } from "@/types/dar";
import { db } from "@/lib/db";
import { hasQmsRole, isPrivilegedQmsRole } from "@/lib/qms-roles";

const darService = new DarService();

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const dar = await db.darMaster.findUnique({ where: { id }, select: { darNo: true } });
  return { title: dar?.darNo ? `${dar.darNo} - Request Details` : "Request Details" };
}

export default async function DarDetailPage({ params }: Props) {
  const [session, { id }] = await Promise.all([requireAuth(), params]);
  const isPrivileged = isPrivilegedQmsRole(session.user.role);

  try {
    const [dar, savedSig] = await Promise.all([
      darService.getDarById(
        id,
        { userId: session.user.id, authUserId: session.user.authUserId ?? null },
        isPrivileged,
      ),
      darService.getSavedSignature(session.user.id),
    ]);

    const isQms = hasQmsRole(session.user.role, "QMS", "MR", "IT");

    const myPendingStep = dar.approvals.find(
      (a: DarApprovalRow) =>
        (a.assignedUser.id === session.user.id || a.assignedUser.authUserId === (session.user.authUserId ?? null)) &&
        a.action === "PENDING" &&
        a.stepRole !== "PREPARER",
    );

    // Redirect to the dedicated approve page — /dar/[id] is read-only view only
    if (myPendingStep) {
      const isReviewer = myPendingStep.stepRole === "REVIEWER";
      redirect(isReviewer ? `/approve/dar/${id}/reviewer` : `/approve/dar/${id}/approver`);
    }

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
        <DarDetailBreadcrumb darNo={dar.darNo} isQms={isQms} />

        <DarReadOnlyDetail
          key={dar.status}
          dar={dar}
          currentUserId={session.user.id}
          savedSignatureUrl={savedSig?.url ?? null}
          savedSignatureType={savedSig?.type ?? null}
          isQms={isQms}
        />
      </div>
    );
  } catch (error) {
    unstable_rethrow(error);

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
