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
  reason: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { year, reason } = bodySchema.parse(await req.json());

    const record = await service.rejectSummary(year, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      accessToken: session.user.accessToken,
    }, reason);

    const url = `${(process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "")}/print/qms/kpi/monthly?year=${year}`;
    const rejectFacts = [
      { labelTh: "ปฏิเสธโดย", labelEn: "Rejected By", value: session.user.name ?? "" },
      { labelTh: "ปี", labelEn: "Year", value: String(year) },
      { labelTh: "เหตุผล", labelEn: "Reason", value: reason },
    ];
    const cycle = record.updatedAt.getTime();
    const recipients: Array<{ userId: string | null; name: string | null; email: string | null }> = [
      { userId: record.reviewerUserId, name: record.reviewerName, email: record.reviewerEmail },
      { userId: record.approverUserId, name: record.approverName, email: record.approverEmail },
    ];
    await Promise.all(recipients.filter((r) => r.email).map((r) => {
      const to: MailRecipient = { name: r.name ?? "", email: r.email! };
      return NotificationService.sendEmailOnce(
        `KPI_MONTHLY_SUMMARY:${record.id}:REJECTED:${cycle}:notify:${r.userId}`,
        () => sendMail({
          to: [to],
          subject: `[KPI] Monthly Summary Rejected - Year ${year}`,
          bodyHtml: makeBilingualMail({
            titleTh: `สรุปผล KPI รายเดือน ปี ${year} ถูกตีกลับ`,
            titleEn: `Monthly KPI Summary ${year} Rejected`,
            facts: rejectFacts,
            actionLabelTh: "ดูสรุปผล",
            actionLabelEn: "View Summary",
            actionUrl: url,
          }),
          senderAccessToken: session.user.accessToken,
        }),
        r.email!,
        "KPI Monthly Summary Rejected",
        r.userId ?? undefined,
        {
          title: "สรุปผล KPI รายเดือนถูกตีกลับ",
          body: `KPI Monthly Summary ปี ${year} ถูกตีกลับ`,
          module: "KPI",
          resourceId: record.id,
          resourceType: "KPI_MONTHLY_SUMMARY",
        },
      ).catch(() => { /* logged inside NotificationService */ });
    }));

    return sendSuccess(record, "Monthly KPI summary rejected");
  } catch (error) {
    return handleApiError(error);
  }
}
