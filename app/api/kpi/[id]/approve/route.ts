import { NotificationService } from '@/services/notificationService';
import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { KpiService } from '@/services/kpiService';
import { getUserSnapshot } from '@/lib/userSnapshotCache';
import { sendKpiResultEmail, makeBilingualMail } from '@/services/email';
import { notifyApprovalConfigQms } from '@/services/approvalConfigNotifier';

const service = new KpiService();

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await _request.json().catch(() => ({}));
    const updated = await service.approveObjectives(id, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
      accessToken: session.user.accessToken,
    }, body);

    const isSystemMaster = updated.department === 'SYSTEM_MASTER';
    const displayDept = isSystemMaster ? 'FM-MR-01 (วัตถุประสงค์คุณภาพประจำปี)' : updated.department;
    const actionUrl = isSystemMaster
      ? `${(process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')}/print/qms/kpi/fm-mr-01?year=${updated.yearly}&mode=review`
      : `${(process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')}/qms/kpi/${id}`;

    const kpiApproveFacts = [
      { labelTh: "หน่วยงาน/เอกสาร", labelEn: "Department/Doc", value: displayDept },
      { labelTh: "ปี", labelEn: "Year", value: String(updated.yearly) },
      { labelTh: "อนุมัติโดย", labelEn: "Approved By", value: session.user.name ?? '' },
      { labelTh: "จำนวนตัวชี้วัด", labelEn: "Objective Count", value: String(updated.objectives.length) },
    ];

    const notifyAuthIds = [updated.reviewerUserId, updated.approverUserId].filter(Boolean) as string[];
    for (const authId of notifyAuthIds) {
      const u = await getUserSnapshot(authId);
      NotificationService.sendEmailOnce(
        `KPI:${id}:APPROVED:notify:${authId}`,
        () => sendKpiResultEmail({
          to: { name: u?.name ?? '', email: u?.email ?? '' },
          departmentName: updated.department,
          year: updated.yearly,
          status: 'APPROVED',
          actorName: session.user.name ?? '',
          kpiId: id,
          objectives: updated.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
          senderAccessToken: session.user.accessToken,
          actionUrl,
        }),
        u?.email ?? '',
        'KPI Approved',
        authId,
        {
          title: "KPI ได้รับการอนุมัติ",
          body: `${displayDept} ปี ${updated.yearly} ได้รับการอนุมัติ`,
          htmlBody: makeBilingualMail({
            titleTh: `ผลการอนุมัติ ${displayDept} ปี ${updated.yearly}`,
            titleEn: `${displayDept} ${updated.yearly} Approved`,
            facts: kpiApproveFacts,
            actionLabelTh: isSystemMaster ? "เปิดดูแผนงาน" : "เปิด KPI",
            actionLabelEn: isSystemMaster ? "Open Plan" : "Open KPI",
            actionUrl,
          }),
          module: "KPI",
          resourceId: id,
          resourceType: "KPI",
        },
      ).catch(() => { /* logged inside NotificationService */ });
    }

    // Notify all dept members
    NotificationService.notifyDeptMembers(
      updated.department,
      session.user.accessToken,
      { title: 'KPI ได้รับการอนุมัติ', body: `KPI ${updated.department} ${updated.yearly} ได้รับการอนุมัติ`, module: 'KPI', resourceId: id, resourceType: 'KPI' },
    ).catch(() => {});

    await notifyApprovalConfigQms('KPI', {
      title: 'KPI ได้รับการอนุมัติ',
      body: `${displayDept} ปี ${updated.yearly} ได้รับการอนุมัติ`,
      module: 'KPI', resourceId: id, resourceType: 'KPI',
    });

    return sendSuccess(updated, 'KPI approved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
