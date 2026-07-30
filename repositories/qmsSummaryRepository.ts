import { BaseRepository } from "./baseRepository";
import { Prisma } from "@/generated/prisma/client";

export class QmsSummaryRepository extends BaseRepository<unknown> {
  constructor() {
    super("darMaster");
  }

  async getSummaryData(tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    return Promise.all([
      client.darMaster.findMany({
        select: {
          id: true,
          requestDate: true,
          status: true,
          docType: true,
          objective: true,
          requesterDepartmentName: true,
          authDepartmentId: true,
          departmentId: true,
        },
      }),
      client.carMaster.findMany({
        select: {
          id: true,
          issuedAt: true,
          createdAt: true,
          status: true,
          targetDepartmentName: true,
          targetAuthDepartmentId: true,
          responseDueAt: true,
        },
      }),
      client.kPIMonthlyDetail.findMany({
        select: {
          id: true,
          actualResult: true,
          achievedStatus: true,
          kpiObjective: {
            select: {
              target: true,
              unit: true,
              objective: true,
            },
          },
          monthlyReport: {
            select: {
              month: true,
              year: true,
              kpi: {
                select: {
                  department: true,
                },
              },
            },
          },
        },
      }),
      client.auditFinding.findMany({
        select: {
          id: true,
          createdAt: true,
          category: true,
          status: true,
          departmentId: true,
        },
      }),
      client.departmentCode.findMany({
        select: {
          authDeptId: true,
          departmentName: true,
          code: true,
        },
      }),
      client.kpiDept.findMany({
        select: {
          name: true,
          authDeptCode: true,
        },
      }),
      client.docControlDept.findMany({
        select: {
          name: true,
          authDeptCode: true,
        },
      }),
    ]);
  }
}
