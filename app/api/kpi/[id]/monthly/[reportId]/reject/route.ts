import { NotificationService } from '@/services/notificationService';
import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { rejectReportSchema } from '@/schemas/kpiSchema';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';
import { getUserSnapshot } from '@/lib/userSnapshotCache';
import { sendKpiMonthlyResultEmail, makeBilingualMail } from '@/services/email';

const service = new KpiMonthlyService();

export async function POST(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const session = await requireAuth();
    const { reportId } = await params;
    const { reason } = rejectReportSchema.parse(await request.json());
    const updated = await service.rejectReport(reportId, reason, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
      accessToken: session.user.accessToken,
    });

    const detail = await service.getReportById(reportId);
    const preparerSig = detail.approvalSignatures?.find((s: { step: string }) => s.step === 'PREPARER');
    const preparerAuthId = (preparerSig as Record<string, unknown>)?.signerAuthUserId as string | null | undefined;
    if (preparerAuthId) {
      const preparer = await getUserSnapshot(preparerAuthId);
      if (preparer?.email) {
        NotificationService.sendEmailOnce(
          `KPI_MONTHLY:${reportId}:REJECTED:preparer:${preparerAuthId}`,
          () => sendKpiMonthlyResultEmail({
            to: { name: preparer.name ?? '', email: preparer.email! },
            departmentName: detail.kpi.department,
            month: detail.month,
            year: detail.year,
            status: 'REJECTED',
            actorName: session.user.name ?? '',
            reason,
            details: detail.details.map((d) => ({
              objective: d.kpiObjective.objective,
              target: d.kpiObjective.target,
              unit: d.kpiObjective.unit,
              actualResult: d.actualResult,
              achievedStatus: d.achievedStatus,
            })),
            reportId: reportId,
            senderAccessToken: session.user.accessToken,
          }),
          preparer.email,
          'Monthly KPI Rejected',
          preparerAuthId,
          {
            title: "KPI รายเดือนถูกปฏิเสธ",
            body: `KPI ${detail.kpi.department} ${detail.month}/${detail.year}`,
            htmlBody: makeBilingualMail({
              titleTh: `KPI รายเดือน ${detail.kpi.department} ถูกปฏิเสธ`,
              titleEn: `Monthly KPI ${detail.kpi.department} Rejected`,
              facts: [
                { labelTh: "หน่วยงาน", labelEn: "Department", value: detail.kpi.department },
                { labelTh: "รอบเดือน", labelEn: "Period", value: `${detail.month}/${detail.year}` },
                { labelTh: "ปฏิเสธโดย", labelEn: "Rejected By", value: session.user.name ?? '' },
                ...(reason ? [{ labelTh: "เหตุผล", labelEn: "Reason", value: reason }] : []),
              ],
              actionLabelTh: "แก้ไข KPI รายเดือน",
              actionLabelEn: "Edit Monthly KPI",
              actionUrl: `${(process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')}/qms/kpi/monthly`,
            }),
            module: "KPI",
            resourceId: reportId,
            resourceType: "KPI_MONTHLY",
          },
        ).catch(() => { /* logged inside NotificationService */ });
      }
    }

    // Notify all dept members
    NotificationService.notifyDeptMembers(
      detail.kpi.department,
      session.user.accessToken,
      {
        title: 'KPI รายเดือนถูกปฏิเสธ',
        body: `KPI ${detail.kpi.department} ${detail.month}/${detail.year} ถูกปฏิเสธ`,
        htmlBody: makeBilingualMail({
          titleTh: `KPI รายเดือน ${detail.kpi.department} ถูกปฏิเสธ`,
          titleEn: `Monthly KPI ${detail.kpi.department} Rejected`,
          facts: [
            { labelTh: "หน่วยงาน", labelEn: "Department", value: detail.kpi.department },
            { labelTh: "รอบเดือน", labelEn: "Period", value: `${detail.month}/${detail.year}` },
            { labelTh: "ปฏิเสธโดย", labelEn: "Rejected By", value: session.user.name ?? '' },
          ],
          actionLabelTh: "ดู KPI รายเดือน",
          actionLabelEn: "View Monthly KPI",
          actionUrl: `${(process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')}/qms/kpi/monthly`,
        }),
        module: 'KPI',
        resourceId: reportId,
        resourceType: 'KPI_MONTHLY',
      },
    ).catch(() => {});

    return sendSuccess(updated, 'Monthly report rejected');
  } catch (error) {
    return handleApiError(error);
  }
}
