import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { AuditSessionPlanRepository } from "@/repositories/audit/auditSessionPlanRepository";
import { QmsConfigService } from "@/services/qmsConfigService";
import { AuditAppointmentRepository } from "@/repositories/audit/auditAppointmentRepository";
import { AuditPlanRepository } from "@/repositories/audit/auditPlanRepository";
import { UserPreferenceRepository } from "@/repositories/userPreferenceRepository";
import { getAuthCenterProfileMap } from "@/lib/auth-center-profile-map";
import AuditSessionPlanPrintTemplate from "@/components/audit/AuditSessionPlanPrintTemplate";

const sessionRepo = new AuditSessionPlanRepository();
const apptRepo = new AuditAppointmentRepository();
const auditPlanRepo = new AuditPlanRepository();
const userPrefRepo = new UserPreferenceRepository();
const qmsConfigService = new QmsConfigService();

async function resolveSessionPlan(id: string) {
  const planDetail = await sessionRepo.findDetailById(id);
  if (planDetail) return planDetail;

  const sp = await sessionRepo.findByAppointmentId(id);
  if (sp) {
    return sessionRepo.findDetailById(sp.id);
  }

  const appt = await apptRepo.findDetailById(id);
  if (appt) {
    const newSp = await sessionRepo.upsertForAppointment(id);
    return sessionRepo.findDetailById(newSp.id);
  }

  return null;
}

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props) {
  const { id } = await params;
  const { type = "session" } = await searchParams;
  const isGantt = type === "gantt";
  
  const [plan, config] = await Promise.all([
    resolveSessionPlan(id).catch(() => null),
    qmsConfigService.getSingleFooterConfig("AUDIT_PLAN"),
  ]);

  const label = config?.label?.trim() || (isGantt ? "Audit Plan Gantt" : "Audit Program Session Plan");
  const numberPart = plan?.appointment?.appointmentNo ? `${plan.appointment.appointmentNo} - ` : "";
  
  return {
    title: `${numberPart}${label}`,
  };
}

export default async function PrintAuditSessionPlanPage({ params, searchParams }: Props) {
  const session = await requireAuth();
  
  const { id } = await params;
  const { type = "session" } = await searchParams;
  const isGantt = type === "gantt";

  const [plan, config] = await Promise.all([
    resolveSessionPlan(id),
    qmsConfigService.getSingleFooterConfig("AUDIT_PLAN"),
  ]);

  if (!plan) {
    notFound();
  }

  const auditPlan = await auditPlanRepo.findByAppointmentId(plan.appointmentId);
  let ownerSignaturePath: string | null = null;
  let ownerNameSnapshot: string | null = null;
  let ownerPositionSnapshot: string | null = null;
  let reviewerPositionSnapshot: string | null = null;
  let approverPositionSnapshot: string | null = null;
  let planSignoffs: Array<{ id: string; signedRole: string; signedByAuthUserId: string; signerNameSnapshot: string | null; signaturePath: string | null; signedAt: Date }> = [];

  if (auditPlan) {
    const ownerPref = await userPrefRepo.findByAuthUserId(auditPlan.ownerAuthUserId);
    ownerSignaturePath = ownerPref?.savedSignatureUrl || null;
    ownerNameSnapshot = auditPlan.ownerNameSnapshot;
    planSignoffs = auditPlan.signoffs.map(s => ({
      id: s.id,
      signedRole: s.signedRole,
      signedByAuthUserId: s.signedByAuthUserId,
      signerNameSnapshot: s.signerNameSnapshot,
      signaturePath: s.signaturePath,
      signedAt: s.signedAt,
    }));

    if (auditPlan.schedules.length > 0) {
      const mappedSessions = auditPlan.schedules.map((s, idx) => {
        const start = new Date(s.startAt);
        const end = new Date(s.endAt);
        const startTime = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
        const endTime = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;

        const teamMembers = s.team.map((tm) => ({
          id: tm.id,
          role: tm.role,
          name: tm.nameSnapshot || "",
          authUserId: tm.authUserId,
        }));

        return {
          id: s.id,
          planId: plan.id,
          orderIndex: idx,
          auditDate: s.startAt,
          startTime,
          endTime,
          department: s.departmentName || s.sessionTitle,
          remark: s.unavailableReason,
          teamMembers,
        };
      });
      Object.assign(plan, { sessions: mappedSessions });
    }
  }

  const appt = plan.appointment as unknown as {
    id: string;
    appointmentNo: string;
    year: number;
    title: string;
    standards: string[];
    status: string;
    publishedAt: Date | null;
    ownerAuthUserId: string | null;
    ownerSignaturePath: string | null;
    ownerNameSnapshot: string | null;
    ownerPositionSnapshot?: string | null;
    reviewerAuthUserId: string | null;
    reviewerNameSnapshot: string | null;
    reviewerPositionSnapshot?: string | null;
    approverAuthUserId: string | null;
    approverNameSnapshot: string | null;
    approverPositionSnapshot?: string | null;
    members: Array<{ id: string; authUserId: string; name: string; department: string | null; role: string }>;
    signoffs: Array<{ id: string; signedRole: string; signedByAuthUserId: string; signerNameSnapshot: string | null; signaturePath: string | null; signedAt: Date }>;
  };

  const lookupUserIds = new Set<string>();
  if (auditPlan?.ownerAuthUserId) lookupUserIds.add(auditPlan.ownerAuthUserId);
  if (auditPlan?.reviewerAuthUserId) lookupUserIds.add(auditPlan.reviewerAuthUserId);
  if (auditPlan?.approverAuthUserId) lookupUserIds.add(auditPlan.approverAuthUserId);
  planSignoffs.forEach((s) => {
    if (s.signedByAuthUserId) lookupUserIds.add(s.signedByAuthUserId);
  });

  if (appt.ownerAuthUserId) lookupUserIds.add(appt.ownerAuthUserId);
  if (appt.reviewerAuthUserId) lookupUserIds.add(appt.reviewerAuthUserId);
  if (appt.approverAuthUserId) lookupUserIds.add(appt.approverAuthUserId);
  appt.signoffs.forEach((s) => {
    if (s.signedByAuthUserId) lookupUserIds.add(s.signedByAuthUserId);
  });

  const profileMap = await getAuthCenterProfileMap(
    Array.from(lookupUserIds).filter(Boolean) as string[],
    session.user.accessToken,
  );

  ownerPositionSnapshot = auditPlan?.ownerAuthUserId
    ? (profileMap.get(auditPlan.ownerAuthUserId)?.jobTitle ?? null)
    : (appt.ownerAuthUserId
      ? (profileMap.get(appt.ownerAuthUserId)?.jobTitle ?? null)
      : null);

  reviewerPositionSnapshot = auditPlan?.reviewerAuthUserId
    ? (profileMap.get(auditPlan.reviewerAuthUserId)?.jobTitle ?? null)
    : (appt.reviewerAuthUserId
      ? (profileMap.get(appt.reviewerAuthUserId)?.jobTitle ?? null)
      : null);

  approverPositionSnapshot = auditPlan?.approverAuthUserId
    ? (profileMap.get(auditPlan.approverAuthUserId)?.jobTitle ?? null)
    : (appt.approverAuthUserId
      ? (profileMap.get(appt.approverAuthUserId)?.jobTitle ?? null)
      : null);

  planSignoffs = planSignoffs.map(s => ({
    ...s,
    position: profileMap.get(s.signedByAuthUserId)?.jobTitle ?? null,
  }));

  if (auditPlan) {
    appt.ownerSignaturePath = ownerSignaturePath;
    appt.ownerNameSnapshot = ownerNameSnapshot;
    appt.ownerPositionSnapshot = ownerPositionSnapshot;
    appt.reviewerPositionSnapshot = reviewerPositionSnapshot;
    appt.approverPositionSnapshot = approverPositionSnapshot;
    appt.signoffs = planSignoffs;
  } else {
    appt.ownerPositionSnapshot = ownerPositionSnapshot;
    appt.reviewerPositionSnapshot = reviewerPositionSnapshot;
    appt.approverPositionSnapshot = approverPositionSnapshot;
    appt.signoffs = appt.signoffs.map(s => ({
      ...s,
      position: profileMap.get(s.signedByAuthUserId)?.jobTitle ?? null,
    }));
  }

  // Serialize everything safely for client component
  const serialized = {
    id: appt.id,
    appointmentNo: appt.appointmentNo,
    year: appt.year,
    title: appt.title,
    standards: appt.standards,
    status: appt.status as string,
    publishedAt: appt.publishedAt?.toISOString() ?? null,
    ownerSignaturePath: appt.ownerSignaturePath ?? null,
    ownerNameSnapshot: appt.ownerNameSnapshot ?? null,
    ownerPositionSnapshot: appt.ownerPositionSnapshot ?? null,
    reviewerNameSnapshot: appt.reviewerNameSnapshot ?? null,
    reviewerPositionSnapshot: appt.reviewerPositionSnapshot ?? null,
    approverNameSnapshot: appt.approverNameSnapshot ?? null,
    approverPositionSnapshot: appt.approverPositionSnapshot ?? null,
    members: appt.members.map((m) => ({
      id: m.id,
      authUserId: m.authUserId,
      name: m.name,
      department: m.department ?? null,
      role: m.role,
    })),
    sessionPlan: {
      id: plan.id,
      reviseNo: plan.reviseNo,
      reviseDate: plan.reviseDate?.toISOString() ?? null,
      sessions: plan.sessions.map((s) => ({
        id: s.id,
        orderIndex: s.orderIndex,
        auditDate: s.auditDate.toISOString(),
        startTime: s.startTime,
        endTime: s.endTime,
        department: s.department,
        remark: s.remark ?? null,
        teamMembers: s.teamMembers.map((tm) => ({
          id: tm.id,
          role: tm.role,
          name: tm.name,
          authUserId: tm.authUserId ?? null,
        })),
      })),
      ganttRows: plan.ganttRows.map((r) => ({
        id: r.id,
        orderIndex: r.orderIndex,
        department: r.department,
        processes: r.processes,
        planWeeks: r.planWeeks,
        actualWeeks: r.actualWeeks,
      })),
    },
    signoffs: appt.signoffs.map((s) => ({
      id: s.id,
      signedRole: s.signedRole,
      signedByAuthUserId: s.signedByAuthUserId,
      signerNameSnapshot: s.signerNameSnapshot ?? null,
      signaturePath: s.signaturePath ?? null,
      signedAt: s.signedAt.toISOString(),
      position: (s as unknown as { position?: string | null }).position ?? null,
    })),
  };

  return (
    <AuditSessionPlanPrintTemplate
      appointment={serialized}
      type={isGantt ? "gantt" : "session"}
      config={config}
    />
  );
}
