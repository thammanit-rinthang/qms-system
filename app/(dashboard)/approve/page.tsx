import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import ApprovePageClient from "@/components/approve/ApprovePageClient";
import { ActionTokenService, type VerifiedActionToken } from "@/services/actionTokenService";
import { AppError } from "@/errors/customErrors";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Approve" };

function resolveActionUrl(t: VerifiedActionToken): string {
  const { module, documentId, role, metadata } = t;
  if (module === "KPI") {
    if (role === "REVIEWER") return `/approve/kpi/${documentId}/reviewer`;
    if (role === "APPROVER") return `/approve/kpi/${documentId}/approver`;
  }
  if (module === "KPI_MONTHLY") {
    const kpiId = metadata?.kpiId;
    if (role === "REVIEWER" && kpiId)
      return `/approve/kpi/${documentId}/reviewer?type=kpi-monthly&kpiId=${kpiId}`;
    if (role === "APPROVER" && kpiId)
      return `/approve/kpi/${documentId}/approver?type=kpi-monthly&kpiId=${kpiId}`;
  }
  if (module === "DAR") {
    if (role === "REVIEWER") return `/approve/dar/${documentId}/reviewer`;
    if (role === "APPROVER_MR" || role === "QMS_PROCESSOR")
      return `/approve/dar/${documentId}/approver`;
  }
  if (module === "AUDIT") {
    const signedRole = metadata?.signedRole;
    if (signedRole === "REVIEWER") return `/approve/audit/${documentId}/reviewer`;
    if (signedRole === "APPROVER") return `/approve/audit/${documentId}/approver`;
  }
  return "/approve";
}

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ApprovePage({ searchParams }: Props) {
  const [session, sp] = await Promise.all([requireAuth(), searchParams]);

  if (sp.token) {
    let errorMessage: string | null = null;
    try {
      const requesterIds = [session.user.authUserId, session.user.id].filter(Boolean) as string[];
      const tokenData = await ActionTokenService.verify(sp.token, requesterIds);
      await ActionTokenService.markUsed(sp.token);
      redirect(resolveActionUrl(tokenData));
    } catch (err) {
      if (err instanceof AppError) {
        errorMessage = err.message;
      } else {
        throw err;
      }
    }

    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-sm font-medium text-red-800 whitespace-pre-line">{errorMessage}</p>
          <a
            href="/approve"
            className="mt-6 inline-block rounded-md bg-[#0f1059] px-5 py-2.5 text-sm font-semibold text-white"
          >
            ไปที่หน้า Approve / Go to Approve
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <ApprovePageClient userRole={session.user.role} />
    </div>
  );
}
