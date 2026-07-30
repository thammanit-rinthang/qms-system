import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { AuditAppointmentService } from "@/services/audit/auditAppointmentService";
import { QmsConfigService } from "@/services/qmsConfigService";
import AuditAppointmentPrintTemplate from "@/components/audit/AuditAppointmentPrintTemplate";

const appointmentService = new AuditAppointmentService();
const qmsConfigService = new QmsConfigService();

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const [appointment, config] = await Promise.all([
    appointmentService.findById(id),
    qmsConfigService.getSingleFooterConfig("AUDIT_APPT"),
  ]);

  const label = config.label.trim() || "Audit Appointment Letter";
  return {
    title: appointment?.appointmentNo ? `${appointment.appointmentNo} - ${label}` : label,
  };
}

export default async function PrintAuditAppointmentPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;

  const [appointment, appointmentConfig, auditorConfig] = await Promise.all([
    appointmentService.findById(id),
    qmsConfigService.getSingleFooterConfig("AUDIT_APPT"),
    qmsConfigService.getSingleFooterConfig("AUDITOR"),
  ]);

  if (!appointment) {
    notFound();
  }

  const serialized = {
    ...appointment,
    ownerSignaturePath: appointment.ownerSignaturePath ?? null,
    publishedAt: appointment.publishedAt?.toISOString() ?? null,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
    members: appointment.members.map((member) => ({ ...member })),
    signoffs: appointment.signoffs.map((signoff) => ({
      ...signoff,
      signedAt: signoff.signedAt.toISOString(),
    })),
  };

  return (
    <AuditAppointmentPrintTemplate
      appointment={serialized}
      appointmentConfig={appointmentConfig}
      auditorConfig={auditorConfig}
    />
  );
}
