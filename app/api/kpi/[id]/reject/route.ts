import { NotificationService } from '@/services/notificationService';
import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { KpiService } from '@/services/kpiService';
import { getUserSnapshot } from '@/lib/userSnapshotCache';
import { sendKpiResultEmail, makeBilingualMail } from '@/services/email';

const service = new KpiService();

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await _request.json().catch(() => ({}));
    const reason: string | undefined = body.reason || undefined;
    const attachments = body.attachments || undefined;

    const updated = await service.rejectObjectives(id, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
      accessToken: session.user.accessToken,
    }, reason, attachments);

    const kpiRejectFacts = [
      { labelTh: "หน่วยงาน", labelEn: "Department", value: updated.department },
      { labelTh: "ปี", labelEn: "Year", value: String(updated.yearly) },
      { labelTh: "ปฏิเสธโดย", labelEn: "Rejected By", value: session.user.name ?? '' },
      { labelTh: "จำนวนตัวชี้วัด", labelEn: "Objective Count", value: String(updated.objectives.length) },
      ...(reason ? [{ labelTh: "เหตุผล", labelEn: "Reason", value: reason }] : []),
    ];

    for (const authId of [updated.reviewerUserId, updated.approverUserId].filter(Boolean) as string[]) {
      const u = await getUserSnapshot(authId);
      if (!u?.email) continue;
      NotificationService.sendEmailOnce(
        `KPI:${id}:REJECTED:notify:${authId}`,
        () => sendKpiResultEmail({
          to: { name: u.name ?? '', email: u.email! },
          departmentName: updated.department,
          year: updated.yearly,
          status: 'REJECTED',
          actorName: session.user.name ?? '',
          kpiId: id,
          objectives: updated.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
          senderAccessToken: session.user.accessToken,
        }),
        u.email,
        'KPI Rejected',
        authId,
        {
          title: "KPI ถูกปฏิเสธ",
          body: `KPI ${updated.department} ${updated.yearly}`,
          htmlBody: makeBilingualMail({ titleTh: `KPI ${updated.department} ปี ${updated.yearly} ถูกปฏิเสธ`, titleEn: `KPI ${updated.department} ${updated.yearly} Rejected`, facts: kpiRejectFacts }),
          module: "KPI",
          resourceId: id,
          resourceType: "KPI",
        },
      ).catch(() => { /* logged inside NotificationService */ });
    }

    NotificationService.notifyDeptMembers(
      updated.department,
      session.user.accessToken,
      { title: 'KPI ถูกปฏิเสธ', body: `KPI ${updated.department} ${updated.yearly} ถูกปฏิเสธ`, module: 'KPI', resourceId: id, resourceType: 'KPI' },
    ).catch(() => {});

    return sendSuccess(updated, 'KPI rejected successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
