import { NextRequest } from "next/server";
import { z } from "zod";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { requireAuth } from "@/lib/auth";
import { KpiMonthlySummaryService } from "@/services/kpiMonthlySummaryService";
import { NotificationService } from "@/services/notificationService";
import { sendMail, makeBilingualMail } from "@/services/email";
import { listAuthCenterAppMembers } from "@/lib/auth-center-admin-client";
import { ForbiddenError, ValidationError } from "@/lib/errors";

const service = new KpiMonthlySummaryService();

const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
});

const bodySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  signatureDataUrl: z.string().min(1).max(2_000_000),
  reviewer: personSchema,
  approver: personSchema,
  emailGroupMails: z.array(z.string()).default([]),
  emailGroupMailsCc: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = bodySchema.parse(await req.json());

    if (!session.user.accessToken) {
      throw new ForbiddenError("An Auth Center session is required to validate workflow assignees");
    }

    const members = await listAuthCenterAppMembers({ accessToken: session.user.accessToken });
    const memberById = new Map(members.map((member) => [member.id, member]));
    const reviewer = memberById.get(body.reviewer.id);
    const approver = memberById.get(body.approver.id);

    if (!reviewer || !approver) {
      throw new ValidationError("Reviewer and approver must be active members of this application");
    }

    const record = await service.submitForReview(body.year, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      accessToken: session.user.accessToken,
    }, {
      signatureDataUrl: body.signatureDataUrl,
       reviewer: { id: reviewer.id, name: reviewer.displayName ?? body.reviewer.name, email: reviewer.email ?? null },
       approver: { id: approver.id, name: approver.displayName ?? body.approver.name, email: approver.email ?? null },
      emailGroupMails: body.emailGroupMails,
      emailGroupMailsCc: body.emailGroupMailsCc,
    });

    if (body.reviewer.email) {
      const url = `${(process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "")}/print/qms/kpi/monthly?year=${body.year}`;
      await NotificationService.sendEmailOnce(
        `KPI_MONTHLY_SUMMARY:${record.id}:SUBMITTED:${record.updatedAt.getTime()}:reviewer:${body.reviewer.id}`,
        () => sendMail({
          to: [{ name: body.reviewer.name, email: body.reviewer.email || "" }],
          subject: `[KPI] Monthly Summary Review Required - Year ${body.year}`,
          bodyHtml: makeBilingualMail({
            titleTh: `สรุปผล KPI รายเดือน ปี ${body.year} รอตรวจสอบ`,
            titleEn: `Monthly KPI Summary ${body.year} Pending Review`,
            facts: [
              { labelTh: "ผู้ตรวจสอบ", labelEn: "Reviewer", value: body.reviewer.name },
              { labelTh: "ปี", labelEn: "Year", value: String(body.year) },
            ],
            actionLabelTh: "ตรวจสอบ",
            actionLabelEn: "Review",
            actionUrl: url,
          }),
          senderAccessToken: session.user.accessToken,
        }),
        body.reviewer.email,
        "KPI Monthly Summary Review Request",
        body.reviewer.id,
        {
          title: "มีสรุปผล KPI รายเดือนรอการตรวจสอบ",
          body: `KPI Monthly Summary ปี ${body.year}`,
          htmlBody: makeBilingualMail({
            titleTh: `สรุปผล KPI รายเดือน ปี ${body.year} รอตรวจสอบ`,
            titleEn: `Monthly KPI Summary ${body.year} Pending Review`,
            facts: [
              { labelTh: "ผู้ตรวจสอบ", labelEn: "Reviewer", value: body.reviewer.name },
              { labelTh: "ปี", labelEn: "Year", value: String(body.year) },
            ],
            actionLabelTh: "ตรวจสอบ",
            actionLabelEn: "Review",
            actionUrl: url,
          }),
          module: "KPI",
          resourceId: record.id,
          resourceType: "KPI_MONTHLY_SUMMARY_REVIEWER",
        },
      ).catch(() => { /* logged inside NotificationService */ });
    }

    return sendSuccess(record, "Monthly KPI summary submitted for review");
  } catch (error) {
    return handleApiError(error);
  }
}
