import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { AuditAppointmentService } from "@/services/audit/auditAppointmentService";
import { type NextRequest } from "next/server";
import { z } from "zod";

const reviewSchema = z.object({
  signatureDataUrl: z.string().nullable().optional(),
  signatureType: z.string().nullable().optional(),
  saveSignature: z.boolean().optional(),
});

const svc = new AuditAppointmentService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = reviewSchema.parse(await req.json().catch(() => ({})));

    const appt = await svc.review(id, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      nameSnapshot: session.user.name,
      email: session.user.email,
      accessToken: session.user.accessToken,
    }, {
      signatureDataUrl: body?.signatureDataUrl ?? null,
      signatureType: body?.signatureType ?? null,
      saveSignature: body?.saveSignature ?? false,
    });

    return sendSuccess(appt, "Appointment reviewed successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
