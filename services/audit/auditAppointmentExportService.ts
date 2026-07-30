import { AuditAppointmentRepository } from "@/repositories/audit/auditAppointmentRepository";
import type { Prisma } from "@/generated/prisma/client";

export class AuditAppointmentExportService {
  private repo = new AuditAppointmentRepository();

  async listAppointments(filter: { year?: number; status?: Prisma.AuditAppointmentWhereInput["status"] }) {
    return this.repo.findForExport(filter);
  }
}
