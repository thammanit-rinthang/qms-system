import { NextRequest } from "next/server";
import { z } from "zod";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { requireAuth } from "@/lib/auth";
import { KpiMonthlySummaryService } from "@/services/kpiMonthlySummaryService";
import { KpiExportService } from "@/services/kpiExportService";
import { NotificationService } from "@/services/notificationService";
import { sendMail, makeBilingualMail, buildKpiMonthlySummaryPrintHtml } from "@/services/email";

const service = new KpiMonthlySummaryService();
const exportService = new KpiExportService();

const attachmentSchema = z.object({
  fileName: z.string(),
  spItemId: z.string(),
  spWebUrl: z.string(),
});

const bodySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  signatureDataUrl: z.string().min(1).max(2_000_000),
  comment: z.string().max(2000).optional(),
  attachments: z.array(attachmentSchema).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { year, signatureDataUrl, comment, attachments } = bodySchema.parse(await req.json());

    const record = await service.reviewSummary(year, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      accessToken: session.user.accessToken,
    }, { signatureDataUrl, comment, attachments });

    if (record.approverEmail) {
      const url = `${(process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "")}/approve/kpi-monthly-summary/${year}/approver`;
      const preview = await exportService.getYearlyPreview({ year });
      const printHtml = buildKpiMonthlySummaryPrintHtml({
        year: preview.year,
        yearBE: preview.yearBE,
        rows: preview.rows,
        reviewerName: record.reviewerName,
        approverName: record.approverName,
      });
      const emailBody = makeBilingualMail({
        titleTh: `สรุปผล KPI รายเดือน ปี ${year} รอการอนุมัติ`,
        titleEn: `Monthly KPI Summary ${year} Pending Approval`,
        facts: [
          { labelTh: "ผู้อนุมัติ", labelEn: "Approver", value: record.approverName ?? "" },
          { labelTh: "ปี", labelEn: "Year", value: String(year) },
        ],
        extraHtml: printHtml,
        actionLabelTh: "อนุมัติ",
        actionLabelEn: "Approve",
        actionUrl: url,
      });
      await NotificationService.sendEmailOnce(
        `KPI_MONTHLY_SUMMARY:${record.id}:REVIEWED:${record.updatedAt.getTime()}:approver:${record.approverUserId}`,
        () => sendMail({
          to: [{ name: record.approverName ?? "", email: record.approverEmail || "" }],
          subject: `[KPI] Monthly Summary Approval Required - Year ${year}`,
          bodyHtml: emailBody,
          senderAccessToken: session.user.accessToken,
        }),
        record.approverEmail,
        "KPI Monthly Summary Approval Request",
        record.approverUserId ?? undefined,
        {
          title: "มีสรุปผล KPI รายเดือนรอการอนุมัติ",
          body: `KPI Monthly Summary ปี ${year}`,
          htmlBody: emailBody,
          module: "KPI",
          resourceId: String(year),
          resourceType: "KPI_MONTHLY_SUMMARY_APPROVER",
        },
      ).catch(() => { /* logged inside NotificationService */ });
    }

    return sendSuccess(record, "Monthly KPI summary reviewed successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
