import { BaseRepository } from "../baseRepository";
import { AuditAppointment, Prisma } from "@/generated/prisma/client";

export class AuditAppointmentRepository extends BaseRepository<AuditAppointment> {
  constructor() {
    super("auditAppointment");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).auditAppointment;
  }

  async findDetailById(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: {
        members: { orderBy: { orderIndex: "asc" } },
        signoffs: true,
      },
    });
  }

  async findWithMembers(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: { members: { orderBy: { orderIndex: "asc" } } },
    });
  }

  async findAll(tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      orderBy: { createdAt: "desc" },
      include: {
        members: { orderBy: { orderIndex: "asc" } },
        signoffs: true,
      },
    });
  }

  async findForExport(
    filter: {
      year?: number;
      status?: Prisma.AuditAppointmentWhereInput["status"];
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.delegate(tx).findMany({
      where: {
        ...(filter.year ? { year: filter.year } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      include: {
        members: { orderBy: { orderIndex: "asc" } },
        signoffs: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async countPendingReviewByUser(authUserId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).count({
      where: { status: "PENDING_REVIEW", reviewerAuthUserId: authUserId },
    });
  }

  async countPendingApproveByUser(authUserId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).count({
      where: { status: "PENDING_APPROVAL", approverAuthUserId: authUserId },
    });
  }

  async findPendingReviewByUser(authUserId: string, take: number, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { status: "PENDING_REVIEW", reviewerAuthUserId: authUserId },
      orderBy: { updatedAt: "desc" },
      take,
      select: { id: true, appointmentNo: true, title: true, year: true, status: true, updatedAt: true },
    });
  }

  async findPendingApproveByUser(authUserId: string, take: number, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { status: "PENDING_APPROVAL", approverAuthUserId: authUserId },
      orderBy: { updatedAt: "desc" },
      take,
      select: { id: true, appointmentNo: true, title: true, year: true, status: true, updatedAt: true },
    });
  }
}
