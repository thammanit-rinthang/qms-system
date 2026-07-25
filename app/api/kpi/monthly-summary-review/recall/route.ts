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

    const record = await service.recallSummary(year, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      accessToken: session.user.accessToken,
    });
    const { previous, ...updated } = record;

    const url = `${(process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "")}/print/qms/kpi/monthly?year=${year}`;
    const cycle = updated.updatedAt.getTime();
    const recipients: Array<{ userId: string | null; name: string | null; email: string | null }> = [
      { userId: previous.reviewerUserId, name: previous.reviewerName, email: previous.reviewerEmail },
      { userId: previous.approverUserId, name: previous.approverName, email: previous.approverEmail },
    ];
    await Promise.all(recipients.filter((r) => r.email).map((r) => {
      const to: MailRecipient = { name: r.name ?? "", email: r.email! };
      return NotificationService.sendEmailOnce(
        `KPI_MONTHLY_SUMMARY:${updated.id}:RECALLED:${cycle}:notify:${r.userId}`,
        () => sendMail({
          to: [to],
          subject: `[KPI] Monthly Summary Recalled - Year ${year}`,
          bodyHtml: makeBilingualMail({
            titleTh: `สรุปผล KPI รายเดือน ปี ${year} ถูกเรียกคืนแล้ว`,
            titleEn: `Monthly KPI Summary ${year} Recalled`,
            facts: [
              { labelTh: "เรียกคืนโดย", labelEn: "Recalled By", value: session.user.name ?? "" },
              { labelTh: "ปี", labelEn: "Year", value: String(year) },
              { labelTh: "หมายเหตุ", labelEn: "Note", value: "เอกสารถูกเรียกคืนกลับเป็นแบบร่าง งานที่มอบหมายถูกยกเลิก / Document recalled to Draft. Your assignment has been cancelled." },
            ],
            actionLabelTh: "ดูสรุปผล",
            actionLabelEn: "View Summary",
            actionUrl: url,
          }),
          senderAccessToken: session.user.accessToken,
        }),
        r.email!,
        "KPI Monthly Summary Recalled",
        r.userId ?? undefined,
        {
          title: "สรุปผล KPI รายเดือนถูกเรียกคืน",
          body: `KPI Monthly Summary ปี ${year} ถูกเรียกคืน`,
          module: "KPI",
          resourceId: String(year),
          resourceType: "KPI_MONTHLY_SUMMARY",
        },
      ).catch(() => { /* logged inside NotificationService */ });
    }));

    return sendSuccess(updated, "Monthly KPI summary recalled");
  } catch (error) {
    return handleApiError(error);
  }
}
