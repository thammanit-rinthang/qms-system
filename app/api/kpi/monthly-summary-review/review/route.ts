import { NextRequest } from "next/server";
import { z } from "zod";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { requireAuth } from "@/lib/auth";
import { KpiMonthlySummaryService } from "@/services/kpiMonthlySummaryService";
import { NotificationService } from "@/services/notificationService";
import { sendMail, makeBilingualMail } from "@/services/email";

const service = new KpiMonthlySummaryService();

const bodySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { year } = bodySchema.parse(await req.json());

    const record = await service.reviewSummary(year, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      accessToken: session.user.accessToken,
    });

    if (record.approverEmail) {
      const url = `${(process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "")}/print/qms/kpi/monthly?year=${year}`;
      await NotificationService.sendEmailOnce(
        `KPI_MONTHLY_SUMMARY:${record.id}:REVIEWED:${record.updatedAt.getTime()}:approver:${record.approverUserId}`,
        () => sendMail({
          to: [{ name: record.approverName ?? "", email: record.approverEmail || "" }],
          subject: `[KPI] Monthly Summary Approval Required - Year ${year}`,
          bodyHtml: makeBilingualMail({
            titleTh: `สรุปผล KPI รายเดือน ปี ${year} รอการอนุมัติ`,
            titleEn: `Monthly KPI Summary ${year} Pending Approval`,
            facts: [
              { labelTh: "ผู้อนุมัติ", labelEn: "Approver", value: record.approverName ?? "" },
              { labelTh: "ปี", labelEn: "Year", value: String(year) },
            ],
            actionLabelTh: "อนุมัติ",
            actionLabelEn: "Approve",
            actionUrl: url,
          }),
          senderAccessToken: session.user.accessToken,
        }),
        record.approverEmail,
        "KPI Monthly Summary Approval Request",
        record.approverUserId ?? undefined,
        {
          title: "มีสรุปผล KPI รายเดือนรอการอนุมัติ",
          body: `KPI Monthly Summary ปี ${year}`,
          htmlBody: makeBilingualMail({
            titleTh: `สรุปผล KPI รายเดือน ปี ${year} รอการอนุมัติ`,
            titleEn: `Monthly KPI Summary ${year} Pending Approval`,
            facts: [
              { labelTh: "ผู้อนุมัติ", labelEn: "Approver", value: record.approverName ?? "" },
              { labelTh: "ปี", labelEn: "Year", value: String(year) },
            ],
            actionLabelTh: "อนุมัติ",
            actionLabelEn: "Approve",
            actionUrl: url,
          }),
          module: "KPI",
          resourceId: record.id,
          resourceType: "KPI_MONTHLY_SUMMARY_APPROVER",
        },
      ).catch(() => { /* logged inside NotificationService */ });
    }

    return sendSuccess(record, "Monthly KPI summary reviewed successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
