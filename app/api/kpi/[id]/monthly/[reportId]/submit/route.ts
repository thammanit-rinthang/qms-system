import { NotificationService } from '@/services/notificationService';
import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireRole } from '@/lib/auth';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';
import { getUserSnapshot } from '@/lib/userSnapshotCache';
import { sendKpiMonthlyApprovalRequestEmail, makeBilingualMail } from '@/services/email';
import { ActionTokenService } from '@/services/actionTokenService';
import { ApprovalModule, ApprovalStep } from '@/generated/prisma/client';

const service = new KpiMonthlyService();

export async function POST(_req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const session = await requireRole('QMS', 'MR', 'IT');
    const { reportId } = await params;
    const body = await _req.json().catch(() => ({}));
    const updated = await service.submitReport(reportId, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
      accessToken: session.user.accessToken,
    }, body);

    const detail = await service.getReportById(reportId);

    // Fallback to KPI's reviewer if not provided in body
    const reviewerId = body.reviewerUserId || detail.kpi.reviewerUserId;
    if (reviewerId) {
      const [reviewer, preparerSnapshot] = await Promise.all([
        getUserSnapshot(reviewerId),
        getUserSnapshot(session.user.id),
      ]);
      if (reviewer?.email) {
        await ActionTokenService.revokeByDocument(ApprovalModule.KPI_MONTHLY, reportId);
        const reviewerToken = await ActionTokenService.issue({
          module: ApprovalModule.KPI_MONTHLY,
          documentId: reportId,
          role: ApprovalStep.REVIEWER,
          issuedTo: reviewerId,
          metadata: { kpiId: detail.kpi.id },
        });

        NotificationService.sendEmailOnce(
          `KPI_MONTHLY:${reportId}:SUBMITTED:reviewer:${reviewerId}:${reviewerToken.substring(0, 16)}`,
          () => sendKpiMonthlyApprovalRequestEmail({
            approver: { name: reviewer.name ?? '', email: reviewer.email! },
            departmentName: detail.kpi.department,
            month: detail.month,
            year: detail.year,
            preparerName: preparerSnapshot?.name ?? session.user.name ?? '',
            details: detail.details.map((d) => ({
              objective: d.kpiObjective.objective,
              target: d.kpiObjective.target,
              unit: d.kpiObjective.unit,
              actualResult: d.actualResult,
              achievedStatus: d.achievedStatus,
            })),
            actionToken: reviewerToken,
            senderAccessToken: session.user.accessToken,
            spItemId: detail.attachmentSpItemId,
            fileName: detail.attachmentFileName,
            mimeType: detail.attachmentMimeType,
          }),
          reviewer.email,
          'Monthly KPI Review Request',
          reviewerId,
          {
            title: "มี KPI รายเดือนรอการ Review",
            body: `KPI ${detail.kpi.department} ${detail.month}/${detail.year}`,
            htmlBody: makeBilingualMail({
              titleTh: `KPI รายเดือน ${detail.kpi.department} รอการตรวจสอบ`,
              titleEn: `Monthly KPI ${detail.kpi.department} Pending Review`,
              facts: [
                { labelTh: "หน่วยงาน", labelEn: "Department", value: detail.kpi.department },
                { labelTh: "รอบเดือน", labelEn: "Period", value: `${detail.month}/${detail.year}` },
                { labelTh: "ผู้จัดเตรียม", labelEn: "Prepared By", value: preparerSnapshot?.name ?? session.user.name ?? '' },
              ],
              actionLabelTh: "ตรวจสอบ KPI รายเดือน",
              actionLabelEn: "Review Monthly KPI",
              actionUrl: `${(process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')}/approve?token=${encodeURIComponent(reviewerToken)}`,
            }),
            module: "KPI",
            resourceId: reportId,
            resourceType: "KPI_MONTHLY_REVIEWER",
          },
        ).catch(() => { /* logged inside NotificationService */ });
      }
    }

    return sendSuccess(updated, 'Monthly report submitted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
