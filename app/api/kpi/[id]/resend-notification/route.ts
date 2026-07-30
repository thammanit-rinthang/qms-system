import { NextRequest } from "next/server";
import { z } from "zod";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { requireAuth, requireRole } from "@/lib/auth";
import { ConflictError, NotFoundError, ValidationError } from "@/errors/customErrors";
import { KpiService } from "@/services/kpiService";
import { ActionTokenService } from "@/services/actionTokenService";
import { ApprovalModule, ApprovalStep } from "@/generated/prisma/client";
import {
  makeBilingualMail,
  makeMasterObjectivesTable,
  sendKpiObjectiveApproverRequestEmail,
  sendKpiObjectiveReviewerAssignedEmail,
  sendMail,
} from "@/services/email";
import { NotificationService } from "@/services/notificationService";
import { QmsConfigService } from "@/services/qmsConfigService";
import { formatKpiAnnualRevisionTag } from "@/lib/kpi-annual-document";

const paramsSchema = z.object({ id: z.string().min(1) });
const service = new KpiService();
const qmsConfigService = new QmsConfigService();

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    await requireRole("QMS", "MR", "IT");

    const { id } = paramsSchema.parse(await context.params);
    const kpi = await service.getKpiById(id);
    if (!kpi) {
      throw new NotFoundError(`KPI ${id} not found`);
    }

    if (kpi.status !== "PENDING_REVIEW" && kpi.status !== "PENDING_APPROVAL") {
      throw new ConflictError(`Cannot resend notification for status: ${kpi.status}`);
    }

    const senderAccessToken = session.user.accessToken ?? null;
    const actorName = session.user.name ?? "System Admin";
    const displayDept = kpi.department === "SYSTEM_MASTER"
      ? "FM-MR-01 (วัตถุประสงค์คุณภาพประจำปี)"
      : kpi.department;

    if (kpi.status === "PENDING_REVIEW") {
      if (!kpi.reviewerUserId || !kpi.reviewerEmail) {
        throw new ValidationError("No reviewer email on record");
      }
      const reviewerEmail = kpi.reviewerEmail;

      await ActionTokenService.revokeByDocumentAndRecipient(ApprovalModule.KPI, id, kpi.reviewerUserId);
      const reviewerToken = await ActionTokenService.issue({
        module: ApprovalModule.KPI,
        documentId: id,
        role: ApprovalStep.REVIEWER,
        issuedTo: kpi.reviewerUserId,
      });

      if (kpi.department === "SYSTEM_MASTER") {
        const url = `${(process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "")}/approve?token=${encodeURIComponent(reviewerToken)}`;
        const [masterRevisionNo, footerConfig] = await Promise.all([
          service.getMasterRevisionNumber(kpi.yearly),
          qmsConfigService.getSingleFooterConfig("KPI_ANNUAL"),
        ]);
        const revisionTag = formatKpiAnnualRevisionTag(footerConfig.prefix, masterRevisionNo);
        await NotificationService.sendEmailOnce(
          `KPI:${id}:RESENT:reviewer:${kpi.reviewerUserId}:${reviewerToken.substring(0, 16)}`,
          async () => {
            await sendMail({
              to: [{ name: kpi.reviewer ?? reviewerEmail ?? "", email: reviewerEmail }],
              subject: `[KPI] FM-MR-01 Review Required - Year ${kpi.yearly}`,
              senderAccessToken,
              bodyHtml: makeBilingualMail({
                titleTh: `วัตถุประสงค์คุณภาพประจำปี (FM-MR-01) ปี ${kpi.yearly} รอตรวจสอบ`,
                titleEn: `Annual Quality Objectives (FM-MR-01) ${kpi.yearly} Pending Review`,
                facts: [
                  { labelTh: "ผู้ตรวจสอบ", labelEn: "Reviewer", value: kpi.reviewer ?? "-" },
                  { labelTh: "ผู้มอบหมาย", labelEn: "Assigned By", value: actorName },
                  { labelTh: "เอกสาร", labelEn: "Document", value: "Annual Quality Objectives (FM-MR-01)" },
                  { labelTh: "ปี", labelEn: "Year", value: String(kpi.yearly) },
                ],
                extraHtml: makeMasterObjectivesTable(kpi.objectives, revisionTag),
                actionLabelTh: "ตรวจสอบแผนงาน",
                actionLabelEn: "Review Plan",
                actionUrl: url,
              }),
            });
          },
          reviewerEmail,
          "KPI Master Review Request",
          kpi.reviewerUserId,
          {
            title: "มีแผนวัตถุประสงค์คุณภาพประจำปี (FM-MR-01) รอการ Review",
            body: `FM-MR-01 ปี ${kpi.yearly}`,
            htmlBody: makeBilingualMail({
              titleTh: `วัตถุประสงค์คุณภาพประจำปี (FM-MR-01) ปี ${kpi.yearly} รอตรวจสอบ`,
              titleEn: `Annual Quality Objectives (FM-MR-01) ${kpi.yearly} Pending Review`,
              facts: [
                { labelTh: "ผู้ตรวจสอบ", labelEn: "Reviewer", value: kpi.reviewer ?? "-" },
                { labelTh: "ผู้มอบหมาย", labelEn: "Assigned By", value: actorName },
                { labelTh: "เอกสาร", labelEn: "Document", value: "Annual Quality Objectives (FM-MR-01)" },
                { labelTh: "ปี", labelEn: "Year", value: String(kpi.yearly) },
              ],
              extraHtml: makeMasterObjectivesTable(kpi.objectives, revisionTag),
              actionLabelTh: "ตรวจสอบแผนงาน",
              actionLabelEn: "Review Plan",
              actionUrl: url,
            }),
            module: "KPI",
            resourceId: id,
            resourceType: "KPI_REVIEWER",
          },
        );
      } else {
        await NotificationService.sendEmailOnce(
          `KPI:${id}:RESENT:reviewer:${kpi.reviewerUserId}:${reviewerToken.substring(0, 16)}`,
          () => sendKpiObjectiveReviewerAssignedEmail({
            reviewer: { name: kpi.reviewer ?? reviewerEmail ?? "", email: reviewerEmail },
            requesterName: actorName,
            departmentName: displayDept,
            kpiId: id,
            objectives: kpi.objectives,
            year: kpi.yearly,
            actionToken: reviewerToken,
            senderAccessToken,
          }),
          reviewerEmail,
          "KPI Review Request",
          kpi.reviewerUserId,
          {
            title: "มี KPI รอการ Review",
            body: `KPI ${displayDept} ${kpi.yearly}`,
            htmlBody: makeBilingualMail({
              titleTh: `${displayDept} ปี ${kpi.yearly} รอตรวจสอบ`,
              titleEn: `${displayDept} ${kpi.yearly} Pending Review`,
              facts: [
                { labelTh: "ผู้ตรวจสอบ", labelEn: "Reviewer", value: kpi.reviewer ?? "-" },
                { labelTh: "ผู้มอบหมาย", labelEn: "Assigned By", value: actorName },
                { labelTh: "หน่วยงาน/เอกสาร", labelEn: "Department/Doc", value: displayDept },
                { labelTh: "ปี", labelEn: "Year", value: String(kpi.yearly) },
              ],
              actionLabelTh: "ตรวจสอบ KPI",
              actionLabelEn: "Review KPI",
              actionUrl: `${(process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "")}/approve?token=${encodeURIComponent(reviewerToken)}`,
            }),
            module: "KPI",
            resourceId: id,
            resourceType: "KPI_REVIEWER",
          },
        );
      }

      return sendSuccess(null, `Resent sign request to reviewer: ${kpi.reviewerEmail}`);
    }

    if (!kpi.approverUserId || !kpi.approverEmail) {
      throw new ValidationError("No approver email on record");
    }
    const approverEmail = kpi.approverEmail;

    await ActionTokenService.revokeByDocumentAndRecipient(ApprovalModule.KPI, id, kpi.approverUserId);
    const approverToken = await ActionTokenService.issue({
      module: ApprovalModule.KPI,
      documentId: id,
      role: ApprovalStep.APPROVER,
      issuedTo: kpi.approverUserId,
    });

    await NotificationService.sendEmailOnce(
      `KPI:${id}:RESENT:approver:${kpi.approverUserId}:${approverToken.substring(0, 16)}`,
      () => sendKpiObjectiveApproverRequestEmail({
        approver: { name: kpi.approver ?? approverEmail ?? "", email: approverEmail },
        reviewerName: kpi.reviewer ?? "-",
        departmentName: displayDept,
        objectives: kpi.objectives,
        year: kpi.yearly,
        actionToken: approverToken,
        senderAccessToken,
      }),
      approverEmail,
      "KPI Approval Request",
      kpi.approverUserId,
      {
        title: "มี KPI รอการอนุมัติ",
        body: `KPI ${displayDept} ${kpi.yearly}`,
        htmlBody: makeBilingualMail({
          titleTh: `${displayDept} ปี ${kpi.yearly} รออนุมัติ`,
          titleEn: `${displayDept} ${kpi.yearly} Pending Approval`,
          facts: [
            { labelTh: "ผู้ตรวจสอบแล้ว", labelEn: "Reviewed By", value: kpi.reviewer ?? "-" },
            { labelTh: "หน่วยงาน/เอกสาร", labelEn: "Department/Doc", value: displayDept },
            { labelTh: "ปี", labelEn: "Year", value: String(kpi.yearly) },
          ],
          actionLabelTh: "อนุมัติ KPI",
          actionLabelEn: "Approve KPI",
          actionUrl: `${(process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "")}/approve?token=${encodeURIComponent(approverToken)}`,
        }),
        module: "KPI",
        resourceId: id,
        resourceType: "KPI_APPROVER",
      },
    );

    return sendSuccess(null, `Resent sign request to approver: ${kpi.approverEmail}`);
  } catch (error) {
    return handleApiError(error);
  }
}
