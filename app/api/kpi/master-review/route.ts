import { NextRequest } from "next/server";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { requireAuth, requireRole } from "@/lib/auth";
import { KpiService } from "@/services/kpiService";
import { ActionTokenService } from "@/services/actionTokenService";
import { NotificationService } from "@/services/notificationService";
import { makeBilingualMail, sendMail, makeMasterObjectivesTable } from "@/services/email";
import { ApprovalModule, ApprovalStep } from "@/generated/prisma/client";
import { getUserSnapshot } from "@/lib/userSnapshotCache";
import { z } from "zod";
import { QmsConfigService } from "@/services/qmsConfigService";
import { formatKpiAnnualRevisionTag } from "@/lib/kpi-annual-document";

const service = new KpiService();
const qmsConfigService = new QmsConfigService();

const masterReviewSchema = z.object({
  yearly: z.union([z.number(), z.string().transform(Number)]),
  signatureDataUrl: z.string(),
  reviewer: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable().optional(),
  }),
  approver: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    await requireRole("QMS", "MR", "IT");

    // Zod parsing of body to resolve missing schema validation warning
    const body = masterReviewSchema.parse(await request.json());
    const { yearly, signatureDataUrl, reviewer, approver } = body;

    const userId = session.user.id;
    const userSnapshot = await getUserSnapshot(userId);
    const actorName = userSnapshot?.name || "System Admin";

    // Call service to do DB transaction
    const updatedKpi = await service.submitMasterReview(
      {
        yearly: Number(yearly),
        signatureDataUrl,
        reviewer: { id: reviewer.id, name: reviewer.name, email: reviewer.email || "" },
        approver: { id: approver.id, name: approver.name, email: approver.email || "" },
      },
      {
        userId,
        authUserId: session.user.authUserId ?? userId,
        role: session.user.role,
        name: actorName,
        accessToken: session.user.accessToken ?? "",
      }
    );

    // Issue action token for REVIEWER
    await ActionTokenService.revokeByDocument(ApprovalModule.KPI, updatedKpi.id);
    const reviewerToken = await ActionTokenService.issue({
      module: ApprovalModule.KPI,
      documentId: updatedKpi.id,
      role: ApprovalStep.REVIEWER,
      issuedTo: reviewer.id,
    });

    // Send Email & Notification
    if (reviewer.email && reviewerToken) {
      const url = `${(process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "")}/approve?token=${encodeURIComponent(reviewerToken)}`;

      // Fetch master KPI details containing aggregated objectives from all departments
      const kpiDetails = await service.getKpiById(updatedKpi.id);
      const [masterRevisionNo, footerConfig] = await Promise.all([
        service.getMasterRevisionNumber(Number(yearly)),
        qmsConfigService.getSingleFooterConfig("KPI_ANNUAL"),
      ]);
      const revisionTag = formatKpiAnnualRevisionTag(footerConfig.prefix, masterRevisionNo);

      await NotificationService.sendEmailOnce(
        `KPI:${updatedKpi.id}:SUBMITTED:reviewer:${reviewer.id}:${reviewerToken.substring(0, 16)}`,
        async () => {
          await sendMail({
            to: [{ name: reviewer.name, email: reviewer.email || "" }],
            subject: `[KPI] FM-MR-01 Review Required - Year ${yearly}`,
            bodyHtml: makeBilingualMail({
              titleTh: `วัตถุประสงค์คุณภาพประจำปี (FM-MR-01) ปี ${yearly} รอตรวจสอบ`,
              titleEn: `Annual Quality Objectives (FM-MR-01) ${yearly} Pending Review`,
              facts: [
                { labelTh: "ผู้ตรวจสอบ", labelEn: "Reviewer", value: reviewer.name },
                { labelTh: "ผู้มอบหมาย", labelEn: "Assigned By", value: actorName },
                { labelTh: "เอกสาร", labelEn: "Document", value: `Annual Quality Objectives (FM-MR-01)` },
                { labelTh: "ปี", labelEn: "Year", value: String(yearly) },
              ],
              extraHtml: makeMasterObjectivesTable(kpiDetails.objectives, revisionTag),
              actionLabelTh: "ตรวจสอบแผนงาน",
              actionLabelEn: "Review Plan",
              actionUrl: url,
            }),
          });
        },
        reviewer.email,
        "KPI Master Review Request",
        reviewer.id,
        {
          title: "มีแผนวัตถุประสงค์คุณภาพประจำปี (FM-MR-01) รอการ Review",
          body: `FM-MR-01 ปี ${yearly}`,
          htmlBody: makeBilingualMail({
            titleTh: `วัตถุประสงค์คุณภาพประจำปี (FM-MR-01) ปี ${yearly} รอตรวจสอบ`,
            titleEn: `Annual Quality Objectives (FM-MR-01) ${yearly} Pending Review`,
            facts: [
              { labelTh: "ผู้ตรวจสอบ", labelEn: "Reviewer", value: reviewer.name },
              { labelTh: "ผู้มอบหมาย", labelEn: "Assigned By", value: actorName },
              { labelTh: "เอกสาร", labelEn: "Document", value: `Annual Quality Objectives (FM-MR-01)` },
              { labelTh: "ปี", labelEn: "Year", value: String(yearly) },
            ],
            extraHtml: makeMasterObjectivesTable(kpiDetails.objectives, revisionTag),
            actionLabelTh: "ตรวจสอบแผนงาน",
            actionLabelEn: "Review Plan",
            actionUrl: url,
          }),
          module: "KPI",
          resourceId: updatedKpi.id,
          resourceType: "KPI_REVIEWER",
        }
      );
    }

    return sendSuccess(updatedKpi, "Master KPI Review started successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
