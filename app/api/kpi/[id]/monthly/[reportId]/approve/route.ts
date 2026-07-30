import { NotificationService } from '@/services/notificationService';
import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';
import { getUserSnapshot } from '@/lib/userSnapshotCache';
import { sendKpiMonthlyResultEmail, makeBilingualMail } from '@/services/email';
import { notifyApprovalConfigQms } from '@/services/approvalConfigNotifier';

const service = new KpiMonthlyService();

export async function POST(_req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const session = await requireAuth();
    const { reportId } = await params;
    const body = await _req.json().catch(() => ({}));
    const updated = await service.approveReport(reportId, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
      accessToken: session.user.accessToken,
    }, body);

    const detail = await service.getReportById(reportId);
    const preparerSigForApprove = detail.approvalSignatures?.find((s: { step: string }) => s.step === 'PREPARER');
    const preparerAuthIdForApprove = (preparerSigForApprove as Record<string, unknown>)?.signerAuthUserId as string | null | undefined;
    if (preparerAuthIdForApprove) {
      const preparer = await getUserSnapshot(preparerAuthIdForApprove);
        NotificationService.sendEmailOnce(
          `KPI_MONTHLY:${reportId}:APPROVED:preparer:${preparerAuthIdForApprove}`,
          () => sendKpiMonthlyResultEmail({
          to: { name: preparer?.name ?? '', email: preparer?.email ?? '' },
            departmentName: detail.kpi.department,
            month: detail.month,
            year: detail.year,
            status: 'APPROVED',
            actorName: session.user.name ?? '',
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
          preparer?.email ?? '',
          'Monthly KPI Approved',
          preparerAuthIdForApprove,
          {
            title: "KPI รายเดือนได้รับการอนุมัติ",
            body: `KPI ${detail.kpi.department} ${detail.month}/${detail.year}`,
            htmlBody: makeBilingualMail({
              titleTh: `KPI รายเดือน ${detail.kpi.department} ได้รับการอนุมัติ`,
              titleEn: `Monthly KPI ${detail.kpi.department} Approved`,
              facts: [
                { labelTh: "หน่วยงาน", labelEn: "Department", value: detail.kpi.department },
                { labelTh: "รอบเดือน", labelEn: "Period", value: `${detail.month}/${detail.year}` },
                { labelTh: "อนุมัติโดย", labelEn: "Approved By", value: session.user.name ?? '' },
              ],
              actionLabelTh: "ดู KPI รายเดือน",
              actionLabelEn: "View Monthly KPI",
              actionUrl: `${(process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')}/qms/kpi/monthly`,
            }),
            module: "KPI",
            resourceId: reportId,
            resourceType: "KPI_MONTHLY",
          },
        ).catch(() => { /* logged inside NotificationService */ });
    }

    // Notify all dept members
    NotificationService.notifyDeptMembers(
      detail.kpi.department,
      session.user.accessToken,
      {
        title: 'KPI รายเดือนได้รับการอนุมัติ',
        body: `KPI ${detail.kpi.department} ${detail.month}/${detail.year}`,
        module: 'KPI',
        resourceId: reportId,
        resourceType: 'KPI_MONTHLY',
      },
    ).catch(() => {});

    await notifyApprovalConfigQms('KPI_MONTHLY', {
      title: 'KPI รายเดือนได้รับการอนุมัติ',
      body: `KPI ${detail.kpi.department} ${detail.month}/${detail.year} ได้รับการอนุมัติ`,
      module: 'KPI', resourceId: reportId, resourceType: 'KPI_MONTHLY',
    });

    return sendSuccess(updated, 'Monthly report approved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
