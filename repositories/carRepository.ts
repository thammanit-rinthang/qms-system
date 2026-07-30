import { BaseRepository, PaginatedResult } from "./baseRepository";
import { CarMaster, Prisma, type CarStatus } from "@/generated/prisma/client";
import type { CarCreateInput, CarRespondInput, CarUpdateInput, CarVerifyInput } from "@/lib/validations/car";
import type { CarListQuery, CarListScope } from "@/types/car";
import { ConflictError } from "@/errors/customErrors";

export class CarRepository extends BaseRepository<CarMaster> {
  constructor() {
    super("carMaster");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).carMaster;
  }

  async findDetailById(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: {
        id: true,
        carNo: true,
        carYear: true,
        sequenceNo: true,
        status: true,
        sourceType: true,
        sourceDetail: true,
        isoStandards: true,
        defectDetail: true,
        nonConformanceRef: true,
        issuerId: true,
        issuerAuthUserId: true,
        issuerName: true,
        issuerEmployeeId: true,
        issuerPosition: true,
        issuerSignaturePath: true,
        issuedAt: true,
        targetDepartmentId: true,
        targetAuthDepartmentId: true,
        targetDepartmentName: true,
        relatedDepartmentIds: true,
        targetEmailGroups: true,
        targetEmailGroupsCc: true,
        responseDueAt: true,
        reCar: true,
        reCarRefId: true,
        createdAt: true,
        updatedAt: true,
        reCarRef: { select: { id: true, carNo: true } },
        reCarChildren: { select: { id: true, carNo: true, status: true } },
        response: {
          select: {
            id: true,
            responderId: true,
            responderAuthUserId: true,
            responderName: true,
            responderEmployeeId: true,
            responderPosition: true,
            responderDepartment: true,
            respondedAt: true,
            responseType: true,
            fiveWhys: true,
            whyAnalysis: true,
            additionalToolDetail: true,
            responderSignaturePath: true,
            rootCausePerson: true,
            rootCauseMaterial: true,
            rootCauseMachine: true,
            rootCauseMethod: true,
            rootCauseOther: true,
            rootCauseOtherDetail: true,
            rootCauseSummary: true,
            immediateAction: true,
            preventiveAction: true,
            plannedCompletionDate: true,
            attachments: {
              select: {
                id: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                spItemId: true,
                spWebUrl: true,
                spDownloadUrl: true,
                folderPath: true,
                uploadedById: true,
                uploadedByName: true,
                createdAt: true,
              },
            },
          },
        },
        verifications: {
          orderBy: { round: "asc" },
          select: {
            id: true,
            round: true,
            verifierId: true,
            verifierAuthUserId: true,
            verifierName: true,
            verifierEmployeeId: true,
            verifierPosition: true,
            verifiedAt: true,
            findings: true,
            result: true,
            nextDueDate: true,
            verifierSignaturePath: true,
            attachments: {
              select: {
                id: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                spItemId: true,
                spWebUrl: true,
                spDownloadUrl: true,
                folderPath: true,
                uploadedById: true,
                uploadedByName: true,
                createdAt: true,
              },
            },
          },
        },
        mrSignature: {
          select: {
            id: true,
            mrUserId: true,
            mrAuthUserId: true,
            mrUserName: true,
            mrEmployeeId: true,
            signedAt: true,
            comment: true,
            attachments: {
              select: {
                id: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                spItemId: true,
                spWebUrl: true,
                spDownloadUrl: true,
                folderPath: true,
                uploadedById: true,
                uploadedByName: true,
                createdAt: true,
              },
            },
          },
        },
        mrResponseReview: {
          select: {
            id: true,
            mrUserId: true,
            mrAuthUserId: true,
            mrUserName: true,
            mrEmployeeId: true,
            reviewedAt: true,
            action: true,
            comment: true,
          },
        },
        notificationLogs: { orderBy: { sentAt: "desc" } },
      },
    });
  }

  async findManySummary(where: Prisma.CarMasterWhereInput = {}, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        carNo: true,
        carYear: true,
        status: true,
        sourceType: true,
        defectDetail: true,
        issuedAt: true,
        responseDueAt: true,
        createdAt: true,
        issuerId: true,
        issuerName: true,
        targetDepartmentId: true,
        targetAuthDepartmentId: true,
        targetDepartmentName: true,
        relatedDepartmentIds: true,
        _count: { select: { verifications: true } },
        response: { select: { respondedAt: true } },
        verifications: {
          orderBy: { round: "desc" },
          take: 1,
          select: { nextDueDate: true, round: true },
        },
      },
    });
  }

  async findManyByDepartment(departmentId: string, tx?: Prisma.TransactionClient) {
    return this.findManySummary({ targetDepartmentId: departmentId }, tx);
  }

  async findForExport(where: Prisma.CarMasterWhereInput = {}, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where,
      include: {
        response: {
          select: {
            rootCauseSummary: true,
            immediateAction: true,
            preventiveAction: true,
            plannedCompletionDate: true,
            respondedAt: true,
            responderName: true,
            responderPosition: true,
            responderDepartment: true,
          },
        },
        verifications: {
          orderBy: { round: "asc" },
          select: {
            round: true,
            result: true,
            verifiedAt: true,
            findings: true,
            nextDueDate: true,
            verifierName: true,
            verifierPosition: true,
          },
        },
        mrSignature: {
          select: { mrUserName: true, signedAt: true, comment: true },
        },
      },
      orderBy: [{ carYear: "desc" }, { sequenceNo: "desc" }],
    });
  }

  async findSummaryReport(year?: number, department?: string, status?: CarStatus) {
    const where: Prisma.CarMasterWhereInput = {};

    if (year) {
      where.carYear = year;
    }
    if (department) {
      where.OR = [
        { targetDepartmentId: department },
        { targetDepartmentName: { contains: department, mode: "insensitive" } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const cars = await this.delegate().findMany({
      where,
      select: {
        id: true,
        status: true,
        targetDepartmentId: true,
        targetDepartmentName: true,
      },
    });

    // Group only from the filtered cars, using targetDepartmentName directly from each record
    const counts = new Map<
      string,
      { departmentName: string; newCount: number; closedCount: number; totalCount: number }
    >();

    for (const car of cars) {
      const deptId = car.targetDepartmentId;
      // Resolve name: prefer targetDepartmentName stored on the record
      const deptName = car.targetDepartmentName?.trim()
        ? car.targetDepartmentName.trim()
        : deptId; // fall back to ID, not "Unknown"

      if (!counts.has(deptId)) {
        counts.set(deptId, { departmentName: deptName, newCount: 0, closedCount: 0, totalCount: 0 });
      } else {
        // If a better name was found later, prefer it
        const existing = counts.get(deptId)!;
        if (!existing.departmentName || existing.departmentName === deptId) {
          existing.departmentName = deptName;
        }
      }

      const val = counts.get(deptId)!;
      val.totalCount += 1;
      if (car.status === "CLOSED") {
        val.closedCount += 1;
      } else if (car.status === "ISSUED") {
        val.newCount += 1;
      }
    }

    return Array.from(counts.entries())
      .map(([deptId, val]) => ({
        departmentId: deptId,
        ...val,
      }))
      .sort((a, b) => a.departmentName.localeCompare(b.departmentName, "th"));
  }

  async findStatusReport(dueFilter?: string, status?: CarStatus | "all") {
    const where: Prisma.CarMasterWhereInput = {};
    const now = new Date();

    if (dueFilter === "near-due") {
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      where.responseDueAt = {
        gte: now,
        lte: sevenDaysLater,
      };
      where.status = {
        notIn: ["CLOSED", "CANCELLED", "DRAFT"],
      };
    } else if (dueFilter === "overdue") {
      where.responseDueAt = {
        lt: now,
      };
      where.status = {
        notIn: ["CLOSED", "CANCELLED", "DRAFT"],
      };
    }

    if (status && status !== "all") {
      where.status = status;
    }

    const cars = await this.delegate().findMany({
      where,
      include: {
        verifications: {
          orderBy: { round: "asc" },
          select: {
            round: true,
            result: true,
            verifiedAt: true,
            findings: true,
          },
        },
        mrSignature: {
          select: {
            signedAt: true,
            comment: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return cars.map((car) => {
      const latestVerification = car.verifications[car.verifications.length - 1];
      const followUp = latestVerification
        ? `Round ${latestVerification.round}: ${latestVerification.result} (${latestVerification.findings})`
        : "Pending Response";

      return {
        id: car.id,
        carNo: car.carNo,
        issuedAt: car.issuedAt,
        defectDetail: car.defectDetail,
        targetDepartmentName: car.targetDepartmentName ?? "Unknown",
        responseDueAt: car.responseDueAt,
        followUp,
        closingDate: car.mrSignature?.signedAt ?? null,
        status: car.status,
        remark: car.mrSignature?.comment ?? latestVerification?.findings ?? "",
      };
    });
  }

  async paginateSummaries(
    query: CarListQuery,
    scope: { scope: CarListScope; issuerAuthUserId?: string; authDepartmentId?: string | null },
    tx?: Prisma.TransactionClient
  ): Promise<PaginatedResult<Awaited<ReturnType<CarRepository["findManySummary"]>>[number]>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const scopedWhere: Prisma.CarMasterWhereInput =
      scope.scope === "mine"
        ? { issuerAuthUserId: scope.issuerAuthUserId ?? "__no-auth-user__" }
        : scope.scope === "my-department"
          ? { targetAuthDepartmentId: scope.authDepartmentId ?? "__no-auth-department__" }
          : {};

    const where: Prisma.CarMasterWhereInput = {
      ...scopedWhere,
      ...(query.status ? { status: query.status } : {}),
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
      ...(search
        ? {
            OR: [
              { carNo: { contains: search, mode: "insensitive" } },
              { defectDetail: { contains: search, mode: "insensitive" } },
              { nonConformanceRef: { contains: search, mode: "insensitive" } },
              { targetDepartmentName: { contains: search, mode: "insensitive" } },
              { issuerName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.delegate(tx).findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { carNo: "desc" }],
        select: {
          id: true,
          carNo: true,
          carYear: true,
          status: true,
          sourceType: true,
          defectDetail: true,
          issuedAt: true,
          responseDueAt: true,
          createdAt: true,
          issuerId: true,
          issuerName: true,
          targetDepartmentId: true,
          targetAuthDepartmentId: true,
          targetDepartmentName: true,
          relatedDepartmentIds: true,
          _count: { select: { verifications: true } },
          response: { select: { respondedAt: true } },
          verifications: {
            orderBy: { round: "desc" },
            take: 1,
            select: { nextDueDate: true, round: true },
          },
        },
      }),
      this.delegate(tx).count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async findForIssue(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        carNo: true,
        sourceType: true,
        sourceDetail: true,
        isoStandards: true,
        defectDetail: true,
        nonConformanceRef: true,
        issuerPosition: true,
        issuerName: true,
        issuerId: true,
        issuerAuthUserId: true,
        responseDueAt: true,
        targetEmailGroups: true,
        targetEmailGroupsCc: true,
        targetDepartmentId: true,
        targetAuthDepartmentId: true,
        targetDepartmentName: true,
      },
    });
  }

  async findForRespond(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        carNo: true,
        defectDetail: true,
        isoStandards: true,
        targetDepartmentId: true,
        targetAuthDepartmentId: true,
        targetDepartmentName: true,
        targetEmailGroups: true,
        targetEmailGroupsCc: true,
        issuerId: true,
        issuerAuthUserId: true,
        issuerName: true,
      },
    });
  }

  async findForVerify(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        carNo: true,
        targetDepartmentId: true,
        targetAuthDepartmentId: true,
        targetDepartmentName: true,
        defectDetail: true,
        isoStandards: true,
        issuerId: true,
        issuerAuthUserId: true,
        issuerName: true,
        targetEmailGroups: true,
        targetEmailGroupsCc: true,
        response: {
          select: { responderAuthUserId: true },
        },
      },
    });
  }

  async findForVerify2DueDate(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        carNo: true,
        targetDepartmentId: true,
        targetAuthDepartmentId: true,
        targetDepartmentName: true,
        defectDetail: true,
        isoStandards: true,
        issuerId: true,
        issuerAuthUserId: true,
        targetEmailGroups: true,
        targetEmailGroupsCc: true,
        response: {
          select: { responderAuthUserId: true },
        },
        verifications: {
          where: { round: 1 },
          select: { id: true, result: true, nextDueDate: true, verifierAuthUserId: true },
          take: 1,
        },
      },
    });
  }

  async findForClose(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        carNo: true,
        issuerAuthUserId: true,
        targetDepartmentId: true,
        targetAuthDepartmentId: true,
        targetDepartmentName: true,
        defectDetail: true,
        isoStandards: true,
        targetEmailGroups: true,
        targetEmailGroupsCc: true,
        response: { select: { responderAuthUserId: true } },
        verifications: { select: { verifierAuthUserId: true } },
      },
    });
  }

  async findForReviewResponse(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        carNo: true,
        issuerAuthUserId: true,
        targetEmailGroups: true,
        targetEmailGroupsCc: true,
        targetDepartmentName: true,
        defectDetail: true,
        isoStandards: true,
        response: { select: { plannedCompletionDate: true, responderAuthUserId: true, attachments: { select: { spItemId: true, fileName: true, mimeType: true } } } },
      },
    });
  }

  async countIssuedForDept(authDepartmentId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).count({ where: { targetAuthDepartmentId: authDepartmentId, status: "ISSUED" } });
  }

  async countPendingMrResponseReviews(tx?: Prisma.TransactionClient) {
    return this.delegate(tx).count({
      where: {
        status: "RESPONDED",
        mrResponseReview: null,
      },
    });
  }

  async countPendingMrSignatures(tx?: Prisma.TransactionClient) {
    return this.delegate(tx).count({
      where: {
        status: "CLOSED",
        mrSignature: null,
      },
    });
  }

  async findPendingMrResponseReviews(take = 10, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: {
        status: "RESPONDED",
        mrResponseReview: null,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take,
      select: {
        id: true,
        carNo: true,
        status: true,
        defectDetail: true,
        targetDepartmentName: true,
        issuedAt: true,
        responseDueAt: true,
        updatedAt: true,
      },
    });
  }

  async findPendingMrSignatures(take = 10, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: {
        status: "CLOSED",
        mrSignature: null,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take,
      select: {
        id: true,
        carNo: true,
        status: true,
        defectDetail: true,
        targetDepartmentName: true,
        issuedAt: true,
        responseDueAt: true,
        updatedAt: true,
      },
    });
  }

  async createMrResponseReviewAndUseToken(
    carId: string,
    token: string,
    mrUserId: string,
    snapshot: { mrAuthUserId?: string | null; mrUserName?: string | null; mrEmployeeId?: string | null },
    action: "APPROVED" | "REJECTED",
    comment: string | null | undefined,
    nextStatus: import("@/generated/prisma/client").CarStatus,
    tx?: Prisma.TransactionClient,
    signaturePath?: string | null,
  ) {
    const client = this.getClient(tx);

    await client.carMrResponseReview.create({
      data: {
        carMasterId: carId,
        mrUserId,
        mrAuthUserId: snapshot.mrAuthUserId ?? null,
        mrUserName: snapshot.mrUserName ?? null,
        mrEmployeeId: snapshot.mrEmployeeId ?? null,
        action,
        comment: comment ?? null,
        signaturePath: signaturePath ?? null,
      },
    });

    await this.updateStatus(carId, nextStatus, tx);

    const result = await client.actionToken.updateMany({
      where: { token, usedAt: null },
      data: { usedAt: new Date() },
    });

    if (result.count === 0) {
      throw new (await import("@/errors/customErrors")).ConflictError("This approval link has already been used by a concurrent request.");
    }
  }

  async createNotificationLog(data: { carMasterId: string; type: string; recipient: string }, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).carNotificationLog.create({ data });
  }

  async createDraft(
    data: CarCreateInput & {
      issuerId: string;
      issuerAuthUserId?: string | null;
      issuerName?: string | null;
      issuerEmployeeId?: string | null;
      targetAuthDepartmentId?: string | null;
      targetDepartmentName?: string | null;
      carNo: string;
      carYear: number;
      sequenceNo: number;
    },
    tx?: Prisma.TransactionClient
  ) {
    return this.delegate(tx).create({
      data: {
        carNo: data.carNo,
        carYear: data.carYear,
        sequenceNo: data.sequenceNo,
        status: "DRAFT",
        sourceType: data.sourceType,
        sourceDetail: data.sourceDetail ?? null,
        isoStandards: data.isoStandards,
        defectDetail: data.defectDetail,
        nonConformanceRef: data.nonConformanceRef,
        issuerId: data.issuerId,
        issuerAuthUserId: data.issuerAuthUserId ?? null,
        issuerName: data.issuerName ?? null,
        issuerEmployeeId: data.issuerEmployeeId ?? null,
        issuerPosition: data.issuerPosition,
        targetDepartmentId: data.targetDepartmentId,
        targetAuthDepartmentId: data.targetAuthDepartmentId ?? null,
        targetDepartmentName: data.targetDepartmentName ?? null,
        relatedDepartmentIds: data.relatedDepartmentIds ?? [],
        targetEmailGroups: data.targetEmailGroups ?? [],
        targetEmailGroupsCc: data.targetEmailGroupsCc ?? [],
        reCar: data.reCar ?? false,
        reCarRefId: data.reCarRefId ?? null,
      },
    });
  }

  async updateDraft(
    id: string,
    input: CarUpdateInput,
    targetAuthDepartmentId?: string | null,
    targetDepartmentName?: string | null,
    tx?: Prisma.TransactionClient
  ) {
    return this.delegate(tx).update({
      where: { id },
      data: {
        sourceType: input.sourceType,
        sourceDetail: input.sourceDetail ?? null,
        isoStandards: input.isoStandards,
        defectDetail: input.defectDetail,
        nonConformanceRef: input.nonConformanceRef,
        issuerPosition: input.issuerPosition,
        targetDepartmentId: input.targetDepartmentId,
        targetAuthDepartmentId: targetAuthDepartmentId ?? null,
        targetDepartmentName: targetDepartmentName ?? null,
        relatedDepartmentIds: input.relatedDepartmentIds ?? [],
        targetEmailGroups: input.targetEmailGroups ?? [],
        targetEmailGroupsCc: input.targetEmailGroupsCc ?? [],
        reCar: input.reCar ?? false,
        reCarRefId: input.reCarRefId ?? null,
      },
    });
  }

  async updateStatus(id: string, status: CarStatus, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({
      where: { id },
      data: { status },
    });
  }

  async issue(id: string, issuedAt: Date, responseDueAt: Date, issuerSignaturePath: string | null, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({
      where: { id },
      data: { status: "ISSUED", issuedAt, responseDueAt, issuerSignaturePath },
    });
  }

  async createResponseAndSetStatus(
    id: string,
    responderId: string,
    snapshot: { responderAuthUserId?: string | null; responderName?: string | null; responderEmployeeId?: string | null },
    input: CarRespondInput,
    tx?: Prisma.TransactionClient
  ) {
    const client = this.getClient(tx);

    // delete existing response + review first (re-respond after MR rejection)
    await client.carMrResponseReview.deleteMany({ where: { carMasterId: id } });
    await client.carResponse.deleteMany({ where: { carMasterId: id } });

    await client.carResponse.create({
      data: {
        carMasterId: id,
        responderId,
        responderAuthUserId: snapshot.responderAuthUserId ?? null,
        responderName: snapshot.responderName ?? null,
        responderEmployeeId: snapshot.responderEmployeeId ?? null,
        responderPosition: input.responderPosition,
        responseType: input.responseType ?? "FIVE_WHY",
        fiveWhys: (input.responseType === "FIVE_WHY" && input.fiveWhys) ? input.fiveWhys : Prisma.JsonNull,
        whyAnalysis: input.whyAnalysis ?? "",
        additionalToolDetail: input.additionalToolDetail ?? null,
        rootCausePerson: input.rootCausePerson,
        rootCauseMaterial: input.rootCauseMaterial,
        rootCauseMachine: input.rootCauseMachine,
        rootCauseMethod: input.rootCauseMethod,
        rootCauseOther: input.rootCauseOther,
        rootCauseOtherDetail: input.rootCauseOtherDetail ?? null,
        rootCauseSummary: input.rootCauseSummary,
        immediateAction: input.immediateAction,
        preventiveAction: input.preventiveAction,
        plannedCompletionDate: new Date(input.plannedCompletionDate),
        responderSignaturePath: input.responderSignaturePath ?? null,
      },
    });

    return this.updateStatus(id, "RESPONDED", tx);
  }

  async createVerificationAndSetStatus(
    id: string,
    input: CarVerifyInput,
    verifierId: string,
    snapshot: { verifierAuthUserId?: string | null; verifierName?: string | null; verifierEmployeeId?: string | null },
    nextStatus: CarStatus,
    tx?: Prisma.TransactionClient
  ) {
    const client = this.getClient(tx);

    const verification = await client.carVerification.create({
      data: {
        carMasterId: id,
        round: input.round,
        verifierId,
        verifierAuthUserId: snapshot.verifierAuthUserId ?? null,
        verifierName: snapshot.verifierName ?? null,
        verifierEmployeeId: snapshot.verifierEmployeeId ?? null,
        verifierPosition: input.verifierPosition,
        findings: input.findings,
        result: input.result,
        nextDueDate: input.nextDueDate ? new Date(input.nextDueDate) : null,
        verifierSignaturePath: input.verifierSignaturePath ?? null,
      },
    });

    await this.updateStatus(id, nextStatus, tx);
    return verification.id;
  }

  async updateVerificationNextDueDate(
    carMasterId: string,
    round: number,
    nextDueDate: Date,
    tx?: Prisma.TransactionClient
  ) {
    return this.getClient(tx).carVerification.updateMany({
      where: { carMasterId, round, result: "FAILED" },
      data: { nextDueDate },
    });
  }

  async createMrSignatureAndUseToken(
    carId: string,
    token: string,
    mrUserId: string,
    snapshot: { mrAuthUserId?: string | null; mrUserName?: string | null; mrEmployeeId?: string | null },
    comment: string | null | undefined,
    tx?: Prisma.TransactionClient,
    signaturePath?: string | null,
  ) {
    const client = this.getClient(tx);

    const sig = await client.carMrSignature.create({
      data: {
        carMasterId: carId,
        mrUserId,
        mrAuthUserId: snapshot.mrAuthUserId ?? null,
        mrUserName: snapshot.mrUserName ?? null,
        mrEmployeeId: snapshot.mrEmployeeId ?? null,
        comment: comment ?? null,
        signaturePath: signaturePath ?? null,
      },
    });

    const result = await client.actionToken.updateMany({
      where: { token, usedAt: null },
      data: { usedAt: new Date() },
    });

    if (result.count === 0) {
      throw new ConflictError("This approval link has already been used by a concurrent request.");
    }

    return sig.id;
  }

  async createMrResponseReview(
    carId: string,
    mrUserId: string,
    snapshot: { mrAuthUserId?: string | null; mrUserName?: string | null; mrEmployeeId?: string | null },
    action: "APPROVED" | "REJECTED",
    comment: string | null | undefined,
    nextStatus: import("@/generated/prisma/client").CarStatus,
    tx?: Prisma.TransactionClient,
    signaturePath?: string | null,
  ) {
    const client = this.getClient(tx);

    await client.carMrResponseReview.create({
      data: {
        carMasterId: carId,
        mrUserId,
        mrAuthUserId: snapshot.mrAuthUserId ?? null,
        mrUserName: snapshot.mrUserName ?? null,
        mrEmployeeId: snapshot.mrEmployeeId ?? null,
        action,
        comment: comment ?? null,
        signaturePath: signaturePath ?? null,
      },
    });

    await this.updateStatus(carId, nextStatus, tx);
  }

  async createMrSignature(
    carId: string,
    mrUserId: string,
    snapshot: { mrAuthUserId?: string | null; mrUserName?: string | null; mrEmployeeId?: string | null },
    comment: string | null | undefined,
    tx?: Prisma.TransactionClient,
    signaturePath?: string | null,
  ) {
    const client = this.getClient(tx);

    const sig = await client.carMrSignature.create({
      data: {
        carMasterId: carId,
        mrUserId,
        mrAuthUserId: snapshot.mrAuthUserId ?? null,
        mrUserName: snapshot.mrUserName ?? null,
        mrEmployeeId: snapshot.mrEmployeeId ?? null,
        comment: comment ?? null,
        signaturePath: signaturePath ?? null,
      },
    });

    return sig.id;
  }

  async createReCarFromOriginal(
    original: {
      id: string;
      sourceType: CarMaster["sourceType"];
      sourceDetail: string | null;
      isoStandards: string[];
      defectDetail: string;
      nonConformanceRef: string;
      issuerName: string | null;
      issuerEmployeeId: string | null;
      issuerPosition: string;
      targetDepartmentId: string;
      targetAuthDepartmentId?: string | null;
      targetDepartmentName?: string | null;
      targetEmailGroups: string[];
      targetEmailGroupsCc: string[];
    },
    data: {
      carNo: string;
      carYear: number;
      sequenceNo: number;
      actorId: string;
      actorAuthUserId?: string | null;
      actorName?: string | null;
      actorEmployeeId?: string | null;
      issuedAt: Date;
      responseDueAt: Date;
    },
    tx?: Prisma.TransactionClient
  ) {
    return this.delegate(tx).create({
      data: {
        carNo: data.carNo,
        carYear: data.carYear,
        sequenceNo: data.sequenceNo,
        status: "ISSUED",
        sourceType: original.sourceType,
        sourceDetail: original.sourceDetail,
        isoStandards: original.isoStandards,
        defectDetail: original.defectDetail,
        nonConformanceRef: original.nonConformanceRef,
        issuerId: data.actorId,
        issuerAuthUserId: data.actorAuthUserId ?? null,
        issuerName: data.actorName ?? original.issuerName,
        issuerEmployeeId: data.actorEmployeeId ?? original.issuerEmployeeId,
        issuerPosition: original.issuerPosition,
        targetDepartmentId: original.targetDepartmentId,
        targetAuthDepartmentId: original.targetAuthDepartmentId ?? null,
        targetDepartmentName: original.targetDepartmentName ?? null,
        targetEmailGroups: original.targetEmailGroups,
        targetEmailGroupsCc: original.targetEmailGroupsCc,
        reCar: true,
        reCarRefId: original.id,
        issuedAt: data.issuedAt,
        responseDueAt: data.responseDueAt,
      },
    });
  }
}
