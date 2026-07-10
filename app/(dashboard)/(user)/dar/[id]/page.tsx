import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import DarReadOnlyDetail from "@/components/dar/DarReadOnlyDetail";
import type { DarApprovalRow } from "@/types/dar";
import { db } from "@/lib/db";

const darService = new DarService();

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const dar = await db.darMaster.findUnique({ where: { id }, select: { darNo: true } });
  return { title: dar?.darNo ? `${dar.darNo} - Request Details` : "Request Details" };
}

export default async function DarDetailPage({ params }: Props) {
  const [session, { id }] = await Promise.all([requireAuth(), params]);
  const isPrivileged = session.user.role === "QMS" || session.user.role === "MR" || session.user.role === "IT";

  try {
    const [dar, savedSig] = await Promise.all([
      darService.getDarById(id, session.user.id, isPrivileged),
      darService.getSavedSignature(session.user.id),
    ]);

    const isQms = session.user.role === "QMS" || session.user.role === "MR";

    const myPendingStep = dar.approvals.find(
      (a: DarApprovalRow) =>
        a.assignedUser.id === session.user.id &&
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
        <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/dar" className="hover:text-slate-600 transition-colors">
            {isQms ? "Document Requests" : "คำขอเอกสาร"}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="text-slate-600 font-medium truncate">
            {dar.darNo ?? (isQms ? "Draft" : "ฉบับร่าง")}
          </span>
        </nav>

        <DarReadOnlyDetail
          dar={dar}
          currentUserId={session.user.id}
          savedSignatureUrl={savedSig?.url ?? null}
          savedSignatureType={savedSig?.type ?? null}
          isQms={isQms}
        />
      </div>
    );
  } catch {
    notFound();
  }
}
