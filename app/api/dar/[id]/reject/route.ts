import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import { NotificationService } from "@/services/notificationService";
import { sendRejectionEmail, makeBilingualMail } from "@/services/email";
import { OBJECTIVE_LABELS, DOC_TYPE_LABELS } from "@/types/dar";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";

const darService = new DarService();

const schema = z.object({
  reason: z.string().min(1, "กรุณาระบุเหตุผล").max(1000),
});

const paramSchema = z.object({ id: z.string().uuid() });
type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = paramSchema.parse(await params);

    const body = await req.json();
    const parsed = schema.parse(body);

    const darBefore = await darService.getDarById(id, session.user.id, true);
    const darNoBeforeReject = darBefore.darNo;

    const dar = await darService.rejectDar(id, { userId: session.user.id, authUserId: session.user.authUserId, accessToken: session.user.accessToken }, parsed.reason);

    revalidateTag(`dar-${id}`);
    revalidateTag("dar-list");

    const rejectedStep = dar.approvals.find(
      (a) => a.assignedUser.id === session.user.id && a.action === "REJECTED"
    );

    const darNo = darNoBeforeReject ?? dar.darNo;
    if (rejectedStep && darNo) {
      const stepLabel = rejectedStep.stepRole === "REVIEWER" ? "Reviewer"
        : rejectedStep.stepRole === "APPROVER_MR" ? "MR"
        : rejectedStep.stepRole;

      const objectiveLabel = OBJECTIVE_LABELS[dar.objective] ?? dar.objective;
      const docTypeLabel = dar.docTypeOther
        ? `${DOC_TYPE_LABELS[dar.docType]} — ${dar.docTypeOther}`
        : DOC_TYPE_LABELS[dar.docType];

      const rejectionFacts = [
        { labelTh: "เลขที่คำขอ", labelEn: "DAR No.", value: darNo },
        { labelTh: "ผู้ร้องขอ", labelEn: "Requester", value: dar.requester.name ?? "" },
        { labelTh: "วัตถุประสงค์", labelEn: "Objective", value: objectiveLabel },
        { labelTh: "ประเภทเอกสาร", labelEn: "Document Type", value: docTypeLabel },
        { labelTh: "จำนวนรายการ", labelEn: "Item Count", value: String(dar.items.length) },
        { labelTh: "ปฏิเสธโดย", labelEn: "Rejected By", value: `${session.user.name ?? stepLabel} (${stepLabel})` },
        { labelTh: "เหตุผล", labelEn: "Reason", value: parsed.reason },
      ];

      const notifHtmlBody = makeBilingualMail({
        titleTh: `DAR ${darNo} ถูกปฏิเสธ`,
        titleEn: `DAR ${darNo} Rejected`,
        facts: rejectionFacts,
      });

      if (dar.requester.email) {
        NotificationService.sendEmailOnce(
          `DAR:${dar.id}:REJECTED:${rejectedStep.stepRole}:requester:${dar.requester.authUserId ?? dar.requester.id}`,
          () => sendRejectionEmail({
            to: { name: dar.requester.name ?? "", email: dar.requester.email! },
            darNo,
            darId: dar.id,
            rejectorName: session.user.name ?? stepLabel,
            stepLabel,
            reason: parsed.reason,
            requesterName: dar.requester.name ?? "",
            objective: objectiveLabel,
            itemCount: dar.items.length,
            senderAccessToken: session.user.accessToken,
          }),
          dar.requester.email,
          `DAR ${darNo} ถูกปฏิเสธโดย ${stepLabel}`,
          dar.requester.authUserId ?? dar.requester.id,
          {
            title: `DAR ${darNo} ถูกปฏิเสธโดย ${stepLabel}`,
            body: `เหตุผล: ${parsed.reason}`,
            htmlBody: notifHtmlBody,
            module: "DAR",
            resourceId: id,
            resourceType: "DAR",
          },
          { forceEmail: true },
        ).catch(() => {});
      }
    }

    return sendSuccess(dar, "DAR rejected successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
