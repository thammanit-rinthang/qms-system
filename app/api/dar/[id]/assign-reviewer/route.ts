import { NotificationService } from '@/services/notificationService';
import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import { sendReviewerAssignedEmail, makeBilingualMail } from "@/services/email";
import { getAuthCenterUserProfile } from "@/lib/auth-center-admin-client";
import { ActionTokenService } from "@/services/actionTokenService";
import { ApprovalModule, ApprovalStep } from "@/generated/prisma/client";
import { OBJECTIVE_LABELS, DOC_TYPE_LABELS } from "@/types/dar";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { getUserSnapshot } from "@/lib/userSnapshotCache";
import { logger } from "@/lib/logger";

const darService = new DarService();

const paramSchema = z.object({ id: z.string().uuid() });

const schema = z.object({
  reviewerUserId: z.string().min(1),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = paramSchema.parse(await params);

    const body = await req.json();
    const parsed = schema.parse(body);

    const dar = await darService.assignReviewer(id, { userId: session.user.id, authUserId: session.user.authUserId, accessToken: session.user.accessToken }, parsed.reviewerUserId);

    revalidateTag(`dar-${id}`);
    revalidateTag("dar-list");

    // Resolve reviewer identity — snapshot cache first, fallback to Auth Center profile
    let reviewerSnapshot = await getUserSnapshot(parsed.reviewerUserId);
    if (!reviewerSnapshot?.email) {
      const profile = await getAuthCenterUserProfile(parsed.reviewerUserId, { accessToken: session.user.accessToken }).catch(() => null);
      if (profile) {
        reviewerSnapshot = {
          authUserId: parsed.reviewerUserId,
          name: profile.displayName,
          email: profile.email,
          employeeId: profile.employeeId,
          departmentId: null,
          departmentName: profile.department,
          m365Linked: !!profile.email,
        };
      }
    }
    const reviewerName = reviewerSnapshot?.name ?? "";
    const reviewerEmail = reviewerSnapshot?.email ?? "";

    if (dar.darNo) {
      await ActionTokenService.revokeByDocument(ApprovalModule.DAR, id);
      const reviewerToken = await ActionTokenService.issue({
        module: ApprovalModule.DAR,
        documentId: id,
        role: ApprovalStep.REVIEWER,
        issuedTo: parsed.reviewerUserId,
      });

      const notifFacts = [
        { labelTh: "ผู้ตรวจสอบ", labelEn: "Reviewer", value: reviewerName },
        { labelTh: "ผู้ร้องขอ", labelEn: "Requester", value: `${dar.requester.name ?? ""}${dar.requester.department?.name ? ` (${dar.requester.department.name})` : ""}` },
        { labelTh: "วันที่ร้องขอ", labelEn: "Request Date", value: dar.requestDate },
        { labelTh: "วัตถุประสงค์", labelEn: "Objective", value: OBJECTIVE_LABELS[dar.objective] },
        { labelTh: "ประเภทเอกสาร", labelEn: "Document Type", value: dar.docTypeOther ? `${DOC_TYPE_LABELS[dar.docType]} — ${dar.docTypeOther}` : DOC_TYPE_LABELS[dar.docType] },
        { labelTh: "จำนวนรายการ", labelEn: "Item Count", value: String(dar.items.length) },
      ];

      if (!reviewerEmail) {
        logger.warn("[assign-reviewer] reviewer email missing, skipping email", { reviewerUserId: parsed.reviewerUserId, reviewerName });
      }
      NotificationService.sendEmailOnce(
        `DAR:${id}:REVIEWER_ASSIGNED:reviewer:${parsed.reviewerUserId}:${reviewerToken.substring(0, 16)}`,
        () => sendReviewerAssignedEmail({
          reviewer: { name: reviewerName, email: reviewerEmail },
          requesterName: dar.requester.name ?? session.user.name ?? "",
          requesterDepartment: dar.requester.department?.name ?? null,
          darNo: dar.darNo!,
          darId: dar.id,
          requestDate: dar.requestDate,
          objective: OBJECTIVE_LABELS[dar.objective],
          docType: dar.docTypeOther
            ? `${DOC_TYPE_LABELS[dar.docType]} — ${dar.docTypeOther}`
            : DOC_TYPE_LABELS[dar.docType],
          reason: dar.reason,
          items: dar.items,
          attachments: dar.attachments.map((a) => ({
            fileName: a.fileName,
            spWebUrl: a.spWebUrl,
          })),
          actionToken: reviewerToken,
          senderAccessToken: session.user.accessToken,
        }),
        reviewerEmail,
        'DAR Reviewer Assigned',
        parsed.reviewerUserId,
        {
          title: "คุณได้รับมอบหมายเป็น Reviewer",
          body: `DAR ${dar.darNo ?? dar.id}`,
          htmlBody: makeBilingualMail({
            titleTh: `คำขอเอกสาร DAR ${dar.darNo} รอตรวจสอบ`,
            titleEn: `DAR ${dar.darNo} Pending Review`,
            facts: notifFacts,
            detailTh: `เหตุผล: ${dar.reason}`,
            detailEn: `Reason: ${dar.reason}`,
          }),
          module: "DAR",
          resourceId: id,
          resourceType: "DAR_REVIEWER",
        },
        { forceEmail: true },
      ).catch((err) => logger.warn("[assign-reviewer] notification failed", { error: err instanceof Error ? err.message : String(err) }));
    }

    return sendSuccess(dar, "Reviewer assigned successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
