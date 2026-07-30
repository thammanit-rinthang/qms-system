import { requireAuthEdge } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { uploadFileToAudit } from "@/services/sharepoint";
import { AuditAttachmentRepository } from "@/repositories/audit/auditAttachmentRepository";
import { AuditScheduleRepository } from "@/repositories/audit/auditScheduleRepository";
import { AuditPlanService } from "@/services/audit/auditPlanService";
import { sendChecklistReceivedEmail } from "@/services/audit/auditEmailService";
import { logger } from "@/lib/logger";
import { type NextRequest } from "next/server";

const repo = new AuditAttachmentRepository();
const scheduleRepo = new AuditScheduleRepository();
const planService = new AuditPlanService();
const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXT = new Set(["pdf", "docx", "xlsx", "png", "jpg", "jpeg"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuthEdge(req);
    const formData = await req.formData();
    const { id: scheduleId } = await params;

    const schedule = await scheduleRepo.findWithPlan(scheduleId);
    if (!schedule) throw new NotFoundError("Schedule not found");

    const actorId = session.user.authUserId ?? session.user.id;
    const isPrivileged = ["QMS", "IT", "MR"].includes(session.user.role);
    const isLeadAuditor = schedule.leadAuditorAuthUserId === actorId;
    if (!isPrivileged && !isLeadAuditor) {
      throw new ForbiddenError("Only the lead auditor or QMS/IT can submit a checklist");
    }
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ValidationError("file is required");

    const rawFilename = (formData.get("filename") as string | null) || file.name;
    let fileName = rawFilename;
    try {
      if (rawFilename.includes("%")) {
        fileName = decodeURIComponent(rawFilename);
      }
    } catch {
      // ignore
    }

    const safeFile = new File([file], fileName, { type: file.type });
    if (safeFile.size > MAX_SIZE) throw new ValidationError("File exceeds 20 MB");

    const ext = safeFile.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.has(ext)) throw new ValidationError("File type not allowed");

    const buffer = Buffer.from(await safeFile.arrayBuffer());
    const result = await uploadFileToAudit({
      fileBuffer: buffer,
      fileName: safeFile.name,
      mimeType: safeFile.type || "application/octet-stream",
      planId: schedule.planId,
    });

    if (!result?.spWebUrl || !result?.spItemId) {
      throw new ValidationError("File upload to storage failed — incomplete response");
    }

    const attachment = await repo.create({
      resourceType: "SCHEDULE_CHECKLIST",
      resourceId: scheduleId,
      fileName: safeFile.name,
      fileUrl: result.spWebUrl,
      sharePointItemId: result.spItemId,
      mimeType: safeFile.type || "application/octet-stream",
      sizeBytes: safeFile.size,
      uploadedByAuthUserId: actorId,
      spDownloadUrl: result.spDownloadUrl ?? null,
    } as Parameters<typeof repo.create>[0]);

    const updated = await planService.submitChecklist(
      scheduleId,
      { userId: session.user.id, authUserId: session.user.authUserId, role: session.user.role, name: session.user.name },
      safeFile.name
    );

    if (schedule.plan.ownerEmail && schedule.departmentName) {
      sendChecklistReceivedEmail({
        to: { name: schedule.plan.ownerNameSnapshot ?? schedule.plan.ownerEmail, email: schedule.plan.ownerEmail },
        planTitle: schedule.plan.title,
        auditNo: schedule.plan.auditNo,
        departmentName: schedule.departmentName,
        sessionTitle: schedule.sessionTitle,
        submittedBy: session.user.name ?? actorId,
        planId: schedule.planId,
        senderAccessToken: session.user.accessToken ?? null,
      }).catch((err) => logger.warn("[checklist] notify owner failed", { error: String(err) }));
    }

    return sendSuccess({ schedule: updated, attachment }, "Checklist submitted", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
