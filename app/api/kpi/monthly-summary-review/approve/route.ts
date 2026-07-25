import { NextRequest } from "next/server";
import { z } from "zod";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { requireAuth } from "@/lib/auth";
import { KpiMonthlySummaryService } from "@/services/kpiMonthlySummaryService";
import { NotificationService } from "@/services/notificationService";
import { sendMail, makeBilingualMail, type MailRecipient } from "@/services/email";

const service = new KpiMonthlySummaryService();

const bodySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { year } = bodySchema.parse(await req.json());

    const record = await service.approveSummary(year, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      accessToken: session.user.accessToken,
    });

    const toList: MailRecipient[] = record.emailGroupMails.map((email) => ({ name: email, email }));
    const ccList: MailRecipient[] = record.emailGroupMailsCc.map((email) => ({ name: email, email }));

    if (toList.length > 0) {
      const url = `${(process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "")}/print/qms/kpi/monthly?year=${year}`;
      await NotificationService.sendEmailOnce(
        `KPI_MONTHLY_SUMMARY:${record.id}:APPROVED:${record.updatedAt.getTime()}:group`,
        () => sendMail({
          to: toList,
          cc: ccList,
          subject: `[KPI] Monthly Summary Approved - Year ${year}`,
          bodyHtml: makeBilingualMail({
            titleTh: `สรุปผล KPI รายเดือน ปี ${year} ได้รับการอนุมัติแล้ว`,
            titleEn: `Monthly KPI Summary ${year} Approved`,
            facts: [
              { labelTh: "ผู้อนุมัติ", labelEn: "Approved By", value: record.approverName ?? "" },
              { labelTh: "ปี", labelEn: "Year", value: String(year) },
            ],
            actionLabelTh: "ดูสรุปผล",
            actionLabelEn: "View Summary",
            actionUrl: url,
          }),
          senderAccessToken: session.user.accessToken,
        }),
        toList[0].email,
        "KPI Monthly Summary Approved",
        undefined,
        {
          title: "สรุปผล KPI รายเดือนได้รับการอนุมัติ",
          body: `KPI Monthly Summary ปี ${year}`,
          module: "KPI",
          resourceId: record.id,
          resourceType: "KPI_MONTHLY_SUMMARY",
        },
      ).catch(() => { /* logged inside NotificationService */ });
    }

    return sendSuccess(record, "Monthly KPI summary approved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
