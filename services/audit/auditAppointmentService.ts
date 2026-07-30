/**
 * Audit appointment service — DRAFT → PENDING_REVIEW → PENDING_APPROVAL → PUBLISHED
 */
import { db } from "@/lib/db";
import { AuditService } from "@/services/auditService";
import { notifyApprovalConfigQms } from "@/services/approvalConfigNotifier";
import { AuditAppointmentRepository } from "@/repositories/audit/auditAppointmentRepository";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AuditAppointmentCreateInput, AuditAppointmentUpdateInput, AuditAppointmentRejectInput } from "@/lib/validations/audit";
import { sendAppointmentSignRequestEmail, sendAppointmentPublishedEmail, sendAppointmentRejectedEmail, buildAppointmentPublishedHtml, buildAppointmentSignRequestHtml, layout, esc } from "./auditEmailService";
import { getDocNoFormat, buildLikePrefix, renderDocNo } from "@/lib/docNoConfig";
import { NotificationService } from "@/services/notificationService";
import { UserPreferenceRepository } from "@/repositories/userPreferenceRepository";

// ─── HTML notification builders (same template as email, minus send wrapper) ──

function getAppUrl(path: string) {
  return `${(process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "")}${path}`;
}

// (Redefined to use buildAppointmentSignRequestHtml from auditEmailService)


function buildRejectedHtml(opts: {
  appointmentId: string;
  appointmentNo: string;
  title: string;
  year: number;
  rejectorName: string;
  signedRole: "REVIEWER" | "APPROVER";
  reason: string;
}): string {
  const roleLabel = opts.signedRole === "APPROVER" ? "Approver" : "Reviewer";
  const yearEn = opts.year - 543;
  const url = getAppUrl(`/audit/appointments/${opts.appointmentId}`);
  return layout({
    badgeColor: "#ef4444",
    badgeText: "Returned",
    title: "Appointment Letter Returned for Revision",
    subtitle: `${opts.appointmentNo} · Returned by ${roleLabel}`,
    rows: [
      { label: "Document No.", value: opts.appointmentNo },
      { label: "Title", value: opts.title },
      { label: "Year", value: `${yearEn} (B.E. ${opts.year})` },
      { label: "Returned by", value: `${opts.rejectorName} (${roleLabel})` },
    ],
    body: `<div style="margin:16px 0 0;padding:14px 16px;background:#fff1f2;border-left:3px solid #f43f5e;border-radius:0 6px 6px 0">
      <p style="font-size:11px;font-weight:700;color:#be123c;text-transform:uppercase;letter-spacing:.5px;margin:0 0 6px">Reason for Return</p>
      <p style="font-size:13px;color:#0f172a;line-height:1.7;margin:0;white-space:pre-wrap">${esc(opts.reason)}</p>
    </div>`,
    actionLabel: "Revise & Resubmit",
    actionUrl: url,
  });
}

// ─── Notify dispatcher ────────────────────────────────────────────────────────

async function sendSignRequest(opts: {
  appointmentId: string;
  appointmentNo: string;
  title: string;
  year: number;
  standards: string[];
  ownerName: string | null;
  reviewerName?: string | null;
  signedRole: "REVIEWER" | "APPROVER";
  targetAuthUserId: string | null;
  targetEmail: string | null;
  targetName: string | null;
  senderAccessToken?: string | null;
}) {
  if (!opts.targetAuthUserId) return;
  const yearEn = opts.year - 543;
  const roleLabel = opts.signedRole === "REVIEWER" ? "Reviewer" : "Approver";
  const idKey = `AUDIT_APPT:${opts.appointmentId}:SIGN_REQUEST:${opts.signedRole}`;
  const subject = `[QMS] Signature Required — Appointment ${opts.appointmentNo} (${roleLabel})`;
  const plainBody = opts.signedRole === "REVIEWER"
    ? `You have been assigned as Reviewer for "${opts.title}" (Year ${yearEn}). Your signature is required.\nPrepared by: ${opts.ownerName ?? "—"}`
    : `You have been assigned as Approver for "${opts.title}" (Year ${yearEn}). Please review and approve to publish.\nPrepared by: ${opts.ownerName ?? "—"} · Reviewed by: ${opts.reviewerName ?? "—"}`;

  // Fetch complete details including members and signoffs
  const apptRepo = new AuditAppointmentRepository();
  const appt = await apptRepo.findDetailById(opts.appointmentId);
  if (!appt) return;

  const signoffsFormatted = appt.signoffs.map(s => ({
    ...s,
    signedAt: s.signedAt.toISOString(),
  }));

  await NotificationService.sendEmailOnce(
    idKey,
    () => sendAppointmentSignRequestEmail({
      to: { name: opts.targetName ?? opts.targetEmail ?? "", email: opts.targetEmail! },
      appointmentNo: opts.appointmentNo,
      title: opts.title,
      year: opts.year,
      standards: opts.standards,
      ownerName: opts.ownerName,
      signedRole: opts.signedRole,
      appointmentId: opts.appointmentId,
      senderAccessToken: opts.senderAccessToken,
      members: appt.members,
      signoffs: signoffsFormatted,
      ownerSignaturePath: appt.ownerSignaturePath,
    }),
    opts.targetEmail ?? "",
    subject,
    opts.targetAuthUserId,
    {
      title: `${opts.signedRole === "REVIEWER" ? "Signature Required" : "Approval Required"} — ${opts.appointmentNo}`,
      body: plainBody,
      htmlBody: buildAppointmentSignRequestHtml({
        appointmentId: opts.appointmentId,
        appointmentNo: opts.appointmentNo,
        title: opts.title,
        year: opts.year,
        standards: opts.standards,
        ownerName: opts.ownerName,
        signedRole: opts.signedRole,
        members: appt.members,
        signoffs: signoffsFormatted,
        ownerSignaturePath: appt.ownerSignaturePath,
      }),
      module: "AUDIT",
      resourceId: opts.appointmentId,
      resourceType: "AUDIT_APPOINTMENT",
    },
  ).catch((err) => logger.warn(`[appointment] ${opts.signedRole} notify failed`, { error: String(err) }));
}

const userPrefRepo = new UserPreferenceRepository();

type SigBody = {
  signatureDataUrl?: string | null;
  signatureType?: string | null;
  saveSignature?: boolean;
};

type Actor = {
  userId: string;
  authUserId?: string | null;
  role: string;
  nameSnapshot?: string | null;
  email?: string | null;
  accessToken?: string | null;
};

const PRIVILEGED = new Set(["QMS", "IT", "MR"]);
const isPrivileged = (role: string) => PRIVILEGED.has(role);

async function nextAppointmentNo(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]
) {
  const format = await getDocNoFormat("AUDIT_APPT");
  const year = new Date().getFullYear();
  const { likePrefix } = buildLikePrefix(format, { year });

  const likePattern = `${likePrefix}%`;
  const startPos = likePrefix.length + 1;
  const existing = await tx.$queryRaw<{ seq: number }[]>`
    SELECT CAST(SUBSTRING(appointment_no FROM ${startPos}) AS INTEGER) AS seq
    FROM audit_appointments
    WHERE appointment_no LIKE ${likePattern}
    ORDER BY seq
  `;
  const used = new Set(existing.map((r) => r.seq));
  let next = 1;
  while (used.has(next)) next++;

  return renderDocNo(format, { year, seq: next });
}

export class AuditAppointmentService {
  private repo = new AuditAppointmentRepository();
  async create(input: AuditAppointmentCreateInput, actor: Actor) {
    if (!isPrivileged(actor.role))
      throw new ForbiddenError("Only QMS/IT/MR can create appointment letters");

    const actorId = actor.authUserId ?? actor.userId;

    // ponytail: retry loop guards against concurrent create race on appointment_no unique constraint
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await db.$transaction(async (tx) => {
          const no = await nextAppointmentNo(tx);
          const appt = await tx.auditAppointment.create({
            data: {
              appointmentNo: no,
              year: input.year,
              title: input.title,
              standards: input.standards,
              ownerAuthUserId: actorId,
              ownerEmail: actor.email ?? null,
              ownerNameSnapshot: actor.nameSnapshot ?? null,
              reviewerAuthUserId: input.reviewerAuthUserId,
              reviewerEmail: input.reviewerEmail,
              reviewerNameSnapshot: input.reviewerNameSnapshot ?? null,
              approverAuthUserId: input.approverAuthUserId,
              approverEmail: input.approverEmail,
              approverNameSnapshot: input.approverNameSnapshot ?? null,
              emailGroupMails: input.emailGroupMails,
              emailGroupMailsCc: input.emailGroupMailsCc,
              showCompanyStamp: input.showCompanyStamp,
              members: {
                create: input.members.map((m, i) => ({
                  authUserId: m.authUserId,
                  name: m.name,
                  department: m.department ?? null,
                  role: m.role,
                  standards: m.standards,
                  orderIndex: m.orderIndex ?? i,
                })),
              },
            },
            include: { members: true, signoffs: true },
          });

          await AuditService.record(
            {
              actorUserId: actor.userId,
              actorAuthUserId: actorId,
              actorRole: actor.role,
              action: "CREATE",
              resourceType: "AUDIT_APPOINTMENT",
              resourceId: appt.id,
            },
            tx
          );

          return appt;
        });
      } catch (err: unknown) {
        const isUniqueViolation =
          typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002";
        if (!isUniqueViolation || attempt === 4) throw err;
        logger.warn("[auditAppointment] appointment_no collision, retrying", { attempt });
      }
    }
    throw new Error("Failed to generate unique appointment number after retries");
  }

  async findAll() {
    return this.repo.findAll();
  }

  async findById(id: string) {
    return this.repo.findDetailById(id);
  }

  async update(id: string, input: AuditAppointmentUpdateInput, actor: Actor) {
    if (!isPrivileged(actor.role))
      throw new ForbiddenError("Only QMS/IT/MR can update appointment letters");

    const appt = await this.repo.findById(id);
    if (!appt) throw new NotFoundError("Appointment not found");
    if (appt.status !== "DRAFT")
      throw new ValidationError("Can only edit appointments in DRAFT status");

    const actorId = actor.authUserId ?? actor.userId;

    return db.$transaction(async (tx) => {
      // Replace members if provided
      if (input.members !== undefined) {
        await tx.auditAppointmentMember.deleteMany({ where: { appointmentId: id } });
        if (input.members.length > 0) {
          await tx.auditAppointmentMember.createMany({
            data: input.members.map((m, i) => ({
              appointmentId: id,
              authUserId: m.authUserId,
              name: m.name,
              department: m.department ?? null,
              role: m.role,
              standards: m.standards ?? [],
              orderIndex: m.orderIndex ?? i,
            })),
          });
        }
      }

      const updated = await tx.auditAppointment.update({
        where: { id },
        data: {
          ...(input.year !== undefined && { year: input.year }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.standards !== undefined && { standards: input.standards }),
          ...(input.reviewerAuthUserId !== undefined && { reviewerAuthUserId: input.reviewerAuthUserId }),
          ...(input.reviewerEmail !== undefined && { reviewerEmail: input.reviewerEmail }),
          ...(input.reviewerNameSnapshot !== undefined && { reviewerNameSnapshot: input.reviewerNameSnapshot }),
          ...(input.approverAuthUserId !== undefined && { approverAuthUserId: input.approverAuthUserId }),
          ...(input.approverEmail !== undefined && { approverEmail: input.approverEmail }),
          ...(input.approverNameSnapshot !== undefined && { approverNameSnapshot: input.approverNameSnapshot }),
          ...(input.emailGroupMails !== undefined && { emailGroupMails: input.emailGroupMails }),
          ...(input.emailGroupMailsCc !== undefined && { emailGroupMailsCc: input.emailGroupMailsCc }),
          ...(input.showCompanyStamp !== undefined && { showCompanyStamp: input.showCompanyStamp }),
        },
        include: { members: { orderBy: { orderIndex: "asc" } }, signoffs: true },
      });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actorId,
          actorRole: actor.role,
          action: "UPDATE",
          resourceType: "AUDIT_APPOINTMENT",
          resourceId: id,
        },
        tx
      );

      return updated;
    });
  }

  async delete(id: string, actor: Actor) {
    if (!isPrivileged(actor.role))
      throw new ForbiddenError("Only QMS/IT/MR can delete appointment letters");

    const appt = await this.repo.findById(id);
    if (!appt) throw new NotFoundError("Appointment not found");
    if (!["DRAFT", "PUBLISHED"].includes(appt.status) && !isPrivileged(actor.role))
      throw new ValidationError("Cannot delete a pending appointment");

    const actorId = actor.authUserId ?? actor.userId;

    return db.$transaction(async (tx) => {
      await tx.auditAppointmentSignoff.deleteMany({ where: { appointmentId: id } });
      await tx.auditAppointmentMember.deleteMany({ where: { appointmentId: id } });
      await tx.auditAppointment.delete({ where: { id } });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actorId,
          actorRole: actor.role,
          action: "DELETE",
          resourceType: "AUDIT_APPOINTMENT",
          resourceId: id,
          before: { status: appt.status, appointmentNo: appt.appointmentNo },
        },
        tx
      );
    });
  }

  async submit(id: string, actor: Actor, ownerSignaturePath?: string) {
    const appt = await this.repo.findById(id);
    if (!appt) throw new NotFoundError("Appointment not found");
    if (appt.status !== "DRAFT")
      throw new ValidationError(`Cannot submit from status ${appt.status}`);

    const actorId = actor.authUserId ?? actor.userId;
    if (!isPrivileged(actor.role) && actorId !== appt.ownerAuthUserId)
      throw new ForbiddenError();

    const updated = await db.$transaction(async (tx) => {
      const u = await tx.auditAppointment.update({
        where: { id },
        data: {
          status: "PENDING_REVIEW",
          rejectReason: null,
          ...(ownerSignaturePath ? { ownerSignaturePath } : {}),
        },
      });
      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actorId,
          actorRole: actor.role,
          action: "SUBMIT",
          resourceType: "AUDIT_APPOINTMENT",
          resourceId: id,
          before: { status: "DRAFT" },
          after: { status: "PENDING_REVIEW" },
        },
        tx
      );
      return u;
    });

    await sendSignRequest({
      appointmentId: id,
      appointmentNo: updated.appointmentNo,
      title: updated.title,
      year: updated.year,
      standards: updated.standards,
      ownerName: appt.ownerNameSnapshot,
      signedRole: "REVIEWER",
      targetAuthUserId: appt.reviewerAuthUserId,
      targetEmail: appt.reviewerEmail,
      targetName: appt.reviewerNameSnapshot,
      senderAccessToken: actor.accessToken,
    });

    return updated;
  }

  async review(id: string, actor: Actor, sigBody?: SigBody | null) {
    const appt = await this.repo.findById(id);
    if (!appt) throw new NotFoundError("Appointment not found");
    if (appt.status !== "PENDING_REVIEW")
      throw new ValidationError(`Cannot review from status ${appt.status}`);

    const actorId = actor.authUserId ?? actor.userId;
    if (!isPrivileged(actor.role) && actorId !== appt.reviewerAuthUserId)
      throw new ForbiddenError();

    const updated = await db.$transaction(async (tx) => {
      await tx.auditAppointmentSignoff.create({
        data: {
          appointmentId: id,
          signedByAuthUserId: actorId,
          signedRole: "REVIEWER",
          signerNameSnapshot: actor.nameSnapshot ?? null,
          signaturePath: sigBody?.signatureDataUrl ?? null,
        },
      });

      if (sigBody?.saveSignature && sigBody.signatureDataUrl) {
        if (actor.userId) {
          await userPrefRepo.upsertSignature(actor.userId, {
            savedSignatureUrl: sigBody.signatureDataUrl,
            signatureType: (sigBody.signatureType as "DRAW" | "TYPE" | "IMAGE") ?? "DRAW",
          }, tx);
        } else {
          logger.warn("[appointment] cannot save signature pref — no local userId", {
            actorAuthUserId: actor.authUserId,
          });
        }
      }

      const u = await tx.auditAppointment.update({
        where: { id },
        data: { status: "PENDING_APPROVAL" },
      });
      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actorId,
          actorRole: actor.role,
          action: "REVIEW",
          resourceType: "AUDIT_APPOINTMENT",
          resourceId: id,
          before: { status: "PENDING_REVIEW" },
          after: { status: "PENDING_APPROVAL" },
        },
        tx
      );
      return u;
    });

    await sendSignRequest({
      appointmentId: id,
      appointmentNo: updated.appointmentNo,
      title: updated.title,
      year: updated.year,
      standards: updated.standards,
      ownerName: appt.ownerNameSnapshot,
      reviewerName: appt.reviewerNameSnapshot,
      signedRole: "APPROVER",
      targetAuthUserId: appt.approverAuthUserId,
      targetEmail: appt.approverEmail,
      targetName: appt.approverNameSnapshot,
      senderAccessToken: actor.accessToken,
    });

    return updated;
  }

  async approve(id: string, actor: Actor, sigBody?: SigBody | null) {
    const appt = await this.repo.findWithMembers(id);
    if (!appt) throw new NotFoundError("Appointment not found");
    if (appt.status !== "PENDING_APPROVAL")
      throw new ValidationError(`Cannot approve from status ${appt.status}`);

    const actorId = actor.authUserId ?? actor.userId;
    if (!isPrivileged(actor.role) && actorId !== appt.approverAuthUserId)
      throw new ForbiddenError();

    const updated = await db.$transaction(async (tx) => {
      await tx.auditAppointmentSignoff.create({
        data: {
          appointmentId: id,
          signedByAuthUserId: actorId,
          signedRole: "APPROVER",
          signerNameSnapshot: actor.nameSnapshot ?? null,
          signaturePath: sigBody?.signatureDataUrl ?? null,
        },
      });

      if (sigBody?.saveSignature && sigBody.signatureDataUrl) {
        if (actor.userId) {
          await userPrefRepo.upsertSignature(actor.userId, {
            savedSignatureUrl: sigBody.signatureDataUrl,
            signatureType: (sigBody.signatureType as "DRAW" | "TYPE" | "IMAGE") ?? "DRAW",
          }, tx);
        } else {
          logger.warn("[appointment] cannot save signature pref — no local userId", {
            actorAuthUserId: actor.authUserId,
          });
        }
      }

      const u = await tx.auditAppointment.update({
        where: { id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actorId,
          actorRole: actor.role,
          action: "APPROVE",
          resourceType: "AUDIT_APPOINTMENT",
          resourceId: id,
          before: { status: "PENDING_APPROVAL" },
          after: { status: "PUBLISHED" },
        },
        tx
      );
      return u;
    });

    // Reload from repository to ensure all signoffs and signatures are fully populated
    const freshAppt = await this.repo.findDetailById(id);
    if (!freshAppt) throw new NotFoundError("Appointment not found");

    const signoffsFormatted = freshAppt.signoffs.map(s => ({
      ...s,
      signedAt: s.signedAt.toISOString(),
    }));

    const pubYearEn = updated.year - 543;
    const approverName = actor.nameSnapshot ?? actorId;

    // Published email — to: emailGroupMails; cc: emailGroupMailsCc + owner + reviewer
    {
      const toList = freshAppt.emailGroupMails.map((m) => ({ name: m, email: m }));
      const ccList: { name: string; email: string }[] = [
        ...freshAppt.emailGroupMailsCc.map((m) => ({ name: m, email: m })),
      ];
      if (freshAppt.ownerEmail) ccList.push({ name: freshAppt.ownerNameSnapshot ?? freshAppt.ownerEmail, email: freshAppt.ownerEmail });
      if (freshAppt.reviewerEmail) ccList.push({ name: freshAppt.reviewerNameSnapshot ?? freshAppt.reviewerEmail, email: freshAppt.reviewerEmail });

      const allRecipients = toList.length ? toList : [...ccList];
      const finalCc = toList.length ? ccList : [];

      if (allRecipients.length) {
        sendAppointmentPublishedEmail({
          recipients: allRecipients,
          cc: finalCc.length ? finalCc : undefined,
          appointmentNo: updated.appointmentNo,
          title: updated.title,
          year: updated.year,
          standards: updated.standards,
          members: freshAppt.members,
          approverName,
          ownerName: freshAppt.ownerNameSnapshot,
          reviewerName: freshAppt.reviewerNameSnapshot,
          appointmentId: id,
          senderAccessToken: actor.accessToken,
          signoffs: signoffsFormatted,
          ownerSignaturePath: freshAppt.ownerSignaturePath,
          showCompanyStamp: freshAppt.showCompanyStamp,
        }).catch((err) =>
          logger.error("[appointment] published email failed", { error: String(err) })
        );
      }
    }

    const publishedHtml = buildAppointmentPublishedHtml({
      appointmentId: id,
      appointmentNo: updated.appointmentNo,
      title: updated.title,
      year: updated.year,
      standards: updated.standards,
      members: freshAppt.members,
      approverName,
      ownerName: freshAppt.ownerNameSnapshot,
      reviewerName: freshAppt.reviewerNameSnapshot,
      signoffs: signoffsFormatted,
      ownerSignaturePath: freshAppt.ownerSignaturePath,
      showCompanyStamp: freshAppt.showCompanyStamp,
    });

    // Notify owner
    if (freshAppt.ownerAuthUserId) {
      await NotificationService.sendEmailOnce(
        `AUDIT_APPT:${id}:PUBLISHED:owner`,
        async () => {},  // published email already sent above to groups; owner gets in-app or is on CC
        freshAppt.ownerEmail ?? "",
        `[QMS] Published — ${updated.appointmentNo}`,
        freshAppt.ownerAuthUserId,
        {
          title: `Published — ${updated.appointmentNo}`,
          body: `Appointment letter "${updated.title}" (Year ${pubYearEn}) has been approved and published.\nApproved by: ${approverName}`,
          htmlBody: publishedHtml,
          module: "AUDIT",
          resourceId: id,
          resourceType: "AUDIT_APPOINTMENT",
        },
      ).catch((err) => logger.warn("[appointment] owner publish notify failed", { error: String(err) }));
    }

    // Notify reviewer (skip if same person as owner)
    if (appt.reviewerAuthUserId && appt.reviewerAuthUserId !== appt.ownerAuthUserId) {
      await NotificationService.sendEmailOnce(
        `AUDIT_APPT:${id}:PUBLISHED:reviewer`,
        async () => {},  // reviewer is on CC of published email already
        appt.reviewerEmail ?? "",
        `[QMS] Published — ${updated.appointmentNo}`,
        appt.reviewerAuthUserId,
        {
          title: `Published — ${updated.appointmentNo}`,
          body: `Appointment letter "${updated.title}" (Year ${pubYearEn}) has been approved and published by ${approverName}.`,
          htmlBody: publishedHtml,
          module: "AUDIT",
          resourceId: id,
          resourceType: "AUDIT_APPOINTMENT",
        },
      ).catch((err) => logger.warn("[appointment] reviewer publish notify failed", { error: String(err) }));
    }

    // Notify each appointed member (skip owner/reviewer already notified above)
    const alreadyNotified = new Set([appt.ownerAuthUserId, appt.reviewerAuthUserId, appt.approverAuthUserId].filter(Boolean));
    const memberNotifyBody = `คุณได้รับการแต่งตั้งเป็น Auditor/Working Committee ใน "${updated.title}" (ปี ${updated.year}) ซึ่งได้รับการอนุมัติและประกาศใช้แล้ว\nApproved by: ${approverName}`;

    await Promise.all(
      appt.members
        .filter((m) => m.authUserId && !alreadyNotified.has(m.authUserId))
        .map((m) =>
          NotificationService.sendEmailOnce(
            `AUDIT_APPT:${id}:PUBLISHED:member:${m.authUserId}`,
            async () => {},
            "",
            `[QMS] Published — ${updated.appointmentNo}`,
            m.authUserId,
            {
              title: `Published — ${updated.appointmentNo}`,
              body: memberNotifyBody,
              htmlBody: publishedHtml,
              module: "AUDIT",
              resourceId: id,
              resourceType: "AUDIT_APPOINTMENT",
            },
          ).catch((err) => logger.warn("[appointment] member publish notify failed", { memberId: m.authUserId, error: String(err) }))
        )
    );

    notifyApprovalConfigQms("AUDIT_APPOINTMENT", {
      title: `ประกาศแต่งตั้งผู้ตรวจติดตาม — ${updated.appointmentNo}`,
      body: `การแต่งตั้ง "${updated.title}" (ปี ${updated.year}) ได้รับการอนุมัติและประกาศใช้แล้ว`,
      module: "AUDIT", resourceId: id, resourceType: "AUDIT_APPOINTMENT",
    }).catch(() => {});

    return updated;
  }

  async reject(id: string, input: AuditAppointmentRejectInput, actor: Actor) {
    const appt = await this.repo.findById(id);
    if (!appt) throw new NotFoundError("Appointment not found");

    const validStatuses =
      input.signedRole === "REVIEWER" ? ["PENDING_REVIEW"] : ["PENDING_APPROVAL"];
    if (!validStatuses.includes(appt.status))
      throw new ValidationError(`Cannot reject from status ${appt.status}`);

    const actorId = actor.authUserId ?? actor.userId;
    const assignedId =
      input.signedRole === "REVIEWER"
        ? appt.reviewerAuthUserId
        : appt.approverAuthUserId;
    if (!isPrivileged(actor.role) && actorId !== assignedId)
      throw new ForbiddenError();

    const updated = await db.$transaction(async (tx) => {
      await tx.auditAppointmentSignoff.deleteMany({ where: { appointmentId: id } });
      const u = await tx.auditAppointment.update({
        where: { id },
        data: { status: "DRAFT", rejectReason: input.reason },
      });
      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actorId,
          actorRole: actor.role,
          action: "REJECT",
          resourceType: "AUDIT_APPOINTMENT",
          resourceId: id,
          before: { status: appt.status },
          after: { status: "DRAFT" },
          metadata: { reason: input.reason },
        },
        tx
      );
      return u;
    });

    if (appt.ownerAuthUserId) {
      const roleLabel = input.signedRole === "REVIEWER" ? "Reviewer" : "Approver";
      const rejectorName = actor.nameSnapshot ? `${actor.nameSnapshot} (${roleLabel})` : roleLabel;
      const rejectYearEn = appt.year - 543;

      await NotificationService.sendEmailOnce(
        `AUDIT_APPT:${id}:REJECTED:${input.signedRole}`,
        () => sendAppointmentRejectedEmail({
          to: { name: appt.ownerNameSnapshot ?? appt.ownerEmail!, email: appt.ownerEmail! },
          appointmentNo: appt.appointmentNo,
          title: appt.title,
          year: appt.year,
          reason: input.reason,
          rejectedByName: actor.nameSnapshot,
          rejectedByRole: input.signedRole,
          appointmentId: id,
          senderAccessToken: actor.accessToken,
        }),
        appt.ownerEmail ?? "",
        `[QMS] Appointment Returned — ${appt.appointmentNo}`,
        appt.ownerAuthUserId,
        {
          title: `Returned for Revision — ${appt.appointmentNo}`,
          body: `${rejectorName} returned appointment letter "${appt.title}" (Year ${rejectYearEn}) for revision.\nReason: ${input.reason}`,
          htmlBody: buildRejectedHtml({
            appointmentId: id,
            appointmentNo: appt.appointmentNo,
            title: appt.title,
            year: appt.year,
            rejectorName,
            signedRole: input.signedRole,
            reason: input.reason,
          }),
          module: "AUDIT",
          resourceId: id,
          resourceType: "AUDIT_APPOINTMENT",
        },
      ).catch((err) => logger.warn("[appointment] reject notify failed", { error: String(err) }));
    }

    return updated;
  }
}
