import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { auditAnnounceSchema } from "@/lib/validations/audit";
import { sendAnnouncementOnce } from "@/services/audit/auditNotificationService";
import { AuditPlanRepository } from "@/repositories/audit/auditPlanRepository";
import { type NextRequest } from "next/server";

const repo = new AuditPlanRepository();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "QMS" && session.user.role !== "IT" && session.user.role !== "MR") {
      throw new ForbiddenError("Only QMS/MR/IT can publish an audit announcement");
    }

    const { id: planId } = await params;
    const body = await req.json();
    const input = auditAnnounceSchema.parse(body);

    const plan = await repo.findForAnnounce(planId);
    if (!plan) throw new ValidationError("Plan not found");

    if (plan.status !== "PLANNED" && plan.status !== "ANNOUNCED") {
      throw new ValidationError("Plan must be in PLANNED or ANNOUNCED status to announce.");
    }

    const announcement = await repo.createAnnouncement({
      planId,
      title: input.title,
      message: input.message,
      deliveryMode: input.deliveryMode,
      publishedAt: new Date(),
      publishedByAuthUserId: session.user.authUserId ?? session.user.id,
    });

    await repo.updateStatus(planId, "ANNOUNCED");

    if (input.recipientEmails.length > 0) {
      sendAnnouncementOnce({
        planId,
        auditNo: plan.auditNo,
        planTitle: plan.title,
        message: input.message,
        recipients: input.recipientEmails.map((e) => ({ name: e, email: e })),
        senderAccessToken: session.user.accessToken,
      }).catch(() => {});
    }

    return sendSuccess(announcement, "Announcement published", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
