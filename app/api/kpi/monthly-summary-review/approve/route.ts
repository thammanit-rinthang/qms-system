import { NextRequest } from "next/server";
import { z } from "zod";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { KpiMonthlySummaryService } from "@/services/kpiMonthlySummaryService";
import { KpiExportService } from "@/services/kpiExportService";
import { NotificationService } from "@/services/notificationService";
import { sendMail, makeBilingualMail, buildKpiMonthlySummaryPrintHtml, type MailRecipient } from "@/services/email";

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

    const record = await service.approveSummary(year, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      accessToken: session.user.accessToken,
    }, { signatureDataUrl, comment, attachments });

    const groupTo: MailRecipient[] = record.emailGroupMails.map((email) => ({ name: email, email }));
    const groupCc: MailRecipient[] = record.emailGroupMailsCc.map((email) => ({ name: email, email }));
    // sendMail() only delivers by looping over `to` — a CC-only selection (no To
    // group) would otherwise be silently dropped, so promote the first CC address
    // into `to` when that's all the user picked.
    const toList: MailRecipient[] = groupTo.length > 0 ? groupTo : groupCc.slice(0, 1);
    const ccList: MailRecipient[] = groupTo.length > 0 ? groupCc : groupCc.slice(1);
    const url = `${(process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "")}/print/qms/kpi/monthly?year=${year}`;
    const preview = await exportService.getYearlyPreview({ year });
    const printHtml = buildKpiMonthlySummaryPrintHtml({
      year: preview.year,
      yearBE: preview.yearBE,
      rows: preview.rows,
      reviewerName: record.reviewerName,
      approverName: record.approverName,
    });
    const emailBody = makeBilingualMail({
      titleTh: `สรุปผล KPI รายเดือน ปี ${year} ได้รับการอนุมัติแล้ว`,
      titleEn: `Monthly KPI Summary ${year} Approved`,
      facts: [
        { labelTh: "ผู้อนุมัติ", labelEn: "Approved By", value: record.approverName ?? "" },
        { labelTh: "ปี", labelEn: "Year", value: String(year) },
      ],
      extraHtml: printHtml,
      actionLabelTh: "ดูสรุปผล",
      actionLabelEn: "View Summary",
      actionUrl: url,
    });

    if (toList.length > 0) {
      await NotificationService.sendEmailOnce(
        `KPI_MONTHLY_SUMMARY:${record.id}:APPROVED:${record.updatedAt.getTime()}:group`,
        () => sendMail({
          to: toList,
          cc: ccList,
          subject: `[KPI] Monthly Summary Approved - Year ${year}`,
          bodyHtml: emailBody,
          senderAccessToken: session.user.accessToken,
        }),
        toList[0].email,
        "KPI Monthly Summary Approved",
        undefined,
        {
          title: "สรุปผล KPI รายเดือนได้รับการอนุมัติ",
          body: `KPI Monthly Summary ปี ${year}`,
          module: "KPI",
          resourceId: String(year),
          resourceType: "KPI_MONTHLY_SUMMARY",
        },
      ).catch(() => { /* logged inside NotificationService */ });
    } else {
      logger.info("[kpi-monthly-summary] Approve group email skipped — no emailGroupMails set at submit", { year, recordId: record.id });
    }

    const preparer = await service.resolvePreparerContact(record, session.user.accessToken);
    if (preparer.email) {
      await NotificationService.sendEmailOnce(
        `KPI_MONTHLY_SUMMARY:${record.id}:APPROVED:${record.updatedAt.getTime()}:preparer:${record.prepareBy}`,
        () => sendMail({
          to: [{ name: preparer.name ?? "", email: preparer.email || "" }],
          subject: `[KPI] Monthly Summary Approved - Year ${year}`,
          bodyHtml: emailBody,
          senderAccessToken: session.user.accessToken,
        }),
        preparer.email,
        "KPI Monthly Summary Approved",
        record.prepareBy ?? undefined,
        {
          title: "สรุปผล KPI รายเดือนได้รับการอนุมัติ",
          body: `KPI Monthly Summary ปี ${year}`,
          htmlBody: emailBody,
          module: "KPI",
          resourceId: String(year),
          resourceType: "KPI_MONTHLY_SUMMARY",
        },
      ).catch(() => { /* logged inside NotificationService */ });
    } else {
      logger.info("[kpi-monthly-summary] Approve preparer email skipped — no resolvable email", { year, recordId: record.id });
    }

    return sendSuccess(record, "Monthly KPI summary approved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
