import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { sendAppointmentSignRequestEmail, sendAppointmentPublishedEmail } from "@/services/audit/auditEmailService";
import { AuditAppointmentRepository } from "@/repositories/audit/auditAppointmentRepository";
import { type NextRequest } from "next/server";

const PRIVILEGED = new Set(["QMS", "IT", "MR"]);
const repo = new AuditAppointmentRepository();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (!PRIVILEGED.has(session.user.role)) throw new ForbiddenError();

    const { id } = await params;
    const appt = await repo.findDetailById(id);
    if (!appt) throw new NotFoundError("Appointment not found");

    const token = session.user.accessToken ?? null;
    const signoffsFormatted = appt.signoffs.map(s => ({
      ...s,
      signedAt: s.signedAt.toISOString(),
    }));

    if (appt.status === "PENDING_REVIEW") {
      if (!appt.reviewerEmail) throw new ValidationError("No reviewer email on record");
      await sendAppointmentSignRequestEmail({
        to: { name: appt.reviewerNameSnapshot ?? appt.reviewerEmail, email: appt.reviewerEmail },
        appointmentNo: appt.appointmentNo,
        title: appt.title,
        year: appt.year,
        standards: appt.standards,
        ownerName: appt.ownerNameSnapshot,
        signedRole: "REVIEWER",
        appointmentId: id,
        senderAccessToken: token,
        members: appt.members,
        signoffs: signoffsFormatted,
        ownerSignaturePath: appt.ownerSignaturePath,
      });
      return sendSuccess(null, `Resent sign request to reviewer: ${appt.reviewerEmail}`);
    }

    if (appt.status === "PENDING_APPROVAL") {
      if (!appt.approverEmail) throw new ValidationError("No approver email on record");
      await sendAppointmentSignRequestEmail({
        to: { name: appt.approverNameSnapshot ?? appt.approverEmail, email: appt.approverEmail },
        appointmentNo: appt.appointmentNo,
        title: appt.title,
        year: appt.year,
        standards: appt.standards,
        ownerName: appt.ownerNameSnapshot,
        signedRole: "APPROVER",
        appointmentId: id,
        senderAccessToken: token,
        members: appt.members,
        signoffs: signoffsFormatted,
        ownerSignaturePath: appt.ownerSignaturePath,
      });
      return sendSuccess(null, `Resent sign request to approver: ${appt.approverEmail}`);
    }

    if (appt.status === "PUBLISHED") {
      const toList = appt.emailGroupMails.map((m) => ({ name: m, email: m }));
      const ccList: { name: string; email: string }[] = [
        ...appt.emailGroupMailsCc.map((m) => ({ name: m, email: m })),
      ];
      if (appt.ownerEmail) ccList.push({ name: appt.ownerNameSnapshot ?? appt.ownerEmail, email: appt.ownerEmail });
      if (appt.reviewerEmail) ccList.push({ name: appt.reviewerNameSnapshot ?? appt.reviewerEmail, email: appt.reviewerEmail });
      const allRecipients = toList.length ? toList : ccList.splice(0);
      if (!allRecipients.length && !ccList.length) throw new ValidationError("No recipients configured");

      await sendAppointmentPublishedEmail({
        recipients: allRecipients,
        cc: ccList.length ? ccList : undefined,
        appointmentNo: appt.appointmentNo,
        title: appt.title,
        year: appt.year,
        standards: appt.standards,
        members: appt.members,
        approverName: appt.approverNameSnapshot ?? "Approver",
        ownerName: appt.ownerNameSnapshot,
        reviewerName: appt.reviewerNameSnapshot,
        appointmentId: id,
        senderAccessToken: token,
        signoffs: signoffsFormatted,
        ownerSignaturePath: appt.ownerSignaturePath,
      });
      return sendSuccess(null, `Resent published announcement to ${allRecipients.length} recipient(s)`);
    }

    throw new ValidationError(`Cannot resend notification for status: ${appt.status}`);
  } catch (err) {
    return handleApiError(err);
  }
}
