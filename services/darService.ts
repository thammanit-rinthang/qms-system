import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { AuditService } from "@/services/auditService";
import { NotificationService } from "@/services/notificationService";
import { DarRepository } from "@/repositories/darRepository";
import { DepartmentCodeRepository } from "@/repositories/departmentCodeRepository";
import { SystemConfigRepository } from "@/repositories/systemConfigRepository";
import { UserPreferenceRepository } from "@/repositories/userPreferenceRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { ApprovalSignatureRepository } from "@/repositories/approvalSignatureRepository";
import { QmsProcessingRepository } from "@/repositories/qmsProcessingRepository";
import { NotFoundError, ValidationError, ForbiddenError, AppError } from "@/errors/customErrors";
import { uploadFileToDar, deleteSpItem } from "@/services/sharepoint";
import { getFileInfo } from "@/lib/sharepoint";
import type { DarDetail, DarSummary, CreateDarInput, DarApprovalRow, ReviewerCandidate, DarAttachmentRow, TempAttachmentInput } from "@/types/dar";
import { Prisma, type DarStatus, type SignatureType } from "@/generated/prisma/client";
import { redis } from "@/lib/redis";
import { getDocNoFormat, buildLikePrefix, renderDocNo } from "@/lib/docNoConfig";

type DarDetailRaw = NonNullable<Awaited<ReturnType<DarRepository["findDetailById"]>>>;
type DarApprovalRaw = DarDetailRaw["approvals"][number];

type ApproveDarInput = {
  signatureDataUrl: string;
  signatureType: SignatureType;
  saveSignature: boolean;
  comment: string | null;
  targetAuthUserId?: string | null; // MR (from REVIEWER step) or QMS (from APPROVER_MR step)
  qmsProcessing?: {
    chkHasAttachment: boolean;
    chkPrintAndValidate: boolean;
    chkRenumber: boolean;
    chkImpactInvestigated: boolean;
    chkSubmitVerification: boolean;
    chkGetBackProcess: boolean;
    chkCopyDistribute: boolean;
    comments?: string | null;
  } | null;
};

type MovedAttachmentResult = {
  t: TempAttachmentInput;
  moved: { spWebUrl: string; spDownloadUrl: string };
  targetPath: string;
};

type ActorIdentity = {
  userId: string;
  authUserId?: string | null;
  accessToken?: string | null;
};

type IdentitySnapshot = {
  id: string;
  authUserId: string | null;
  name: string | null;
  email: string | null;
  employeeId: string | null;
  department: { id: string; name: string } | null;
};

export class DarService {
  private darRepo = new DarRepository();
  private configRepo = new SystemConfigRepository();
  private userPrefRepo = new UserPreferenceRepository();
  private deptRepo = new DepartmentRepository();
  private deptCodeRepo = new DepartmentCodeRepository();

  /**
   * Resolve a designated user (MR or QMS) for approval routing.
   * Priority: SystemConfig authKey → SystemConfig localKey → first Auth Center role grant match.
   */
  private async resolveDesignatedUser(
    authConfigKey: string,
    localConfigKey: string,
    fallbackRole?: string,
    accessToken?: string | null,
  ): Promise<{ authUserId: string } | null> {
    const authUserKey = await this.configRepo.findValueByKey(authConfigKey);
    if (authUserKey) return { authUserId: authUserKey };

    const localKey = await this.configRepo.findValueByKey(localConfigKey);
    if (localKey) return { authUserId: localKey };

    if (fallbackRole) {
      try {
        const { listAuthCenterRoleGrants } = await import("@/lib/auth-center-admin-client");
        const grants = await listAuthCenterRoleGrants({ accessToken });
        const match = grants.find((g) => g.role === fallbackRole);
        if (match) return { authUserId: match.userId };
      } catch (err) {
        logger.warn("[DarService.resolveDesignatedUser] Auth Center role grant lookup failed", { fallbackRole, error: String(err) });
      }
    }

    return null;
  }
  private approvalSignatureRepo = new ApprovalSignatureRepository();
  private qmsProcessingRepo = new QmsProcessingRepository();

  private async getIdentitySnapshot(authUserId: string, _tx?: Prisma.TransactionClient): Promise<IdentitySnapshot | null> {
    const { getUserSnapshot } = await import("@/lib/userSnapshotCache");
    const cached = await getUserSnapshot(authUserId);
    if (cached) {
      return {
        id: cached.authUserId,
        authUserId: cached.authUserId,
        name: cached.name,
        email: cached.email,
        employeeId: cached.employeeId,
        department: cached.departmentName
          ? { id: cached.departmentId ?? cached.authUserId, name: cached.departmentName }
          : null,
      };
    }
    return null;
  }

  private mapApproval(a: DarApprovalRaw): DarApprovalRow {
    return {
      id: a.id,
      stepRole: a.stepRole,
      action: a.action,
      actionDate: a.actionDate?.toISOString() ?? null,
      signatureUsedUrl: a.signatureUsedUrl,
      signatureTypeUsed: a.signatureTypeUsed,
      comment: a.comment,
      assignedUser: {
        id: a.assignedUserId,
        authUserId: a.assignedAuthUserId ?? null,
        name: a.assignedUserName ?? null,
        employeeId: a.assignedEmployeeId ?? null,
        department: a.assignedDepartmentName
          ? { id: "", name: a.assignedDepartmentName }
          : null,
      },
    };
  }

  private async fetchDarDetail(id: string, tx?: Prisma.TransactionClient): Promise<DarDetail | null> {
    const master = await this.darRepo.findDetailById(id, tx);
    if (!master) return null;

    return {
      id: master.id,
      darNo: master.darNo,
      requestDate: master.requestDate.toISOString(),
      objective: master.objective as DarDetail["objective"],
      docType: master.docType as DarDetail["docType"],
      docTypeOther: master.docTypeOther,
      reason: master.reason,
      status: master.status,
      requester: {
        id: master.requesterId,
        authUserId: master.requesterAuthUserId ?? null,
        name: master.requesterName ?? null,
        employeeId: master.requesterEmployeeId ?? null,
        email: master.requesterEmail ?? null,
        department: master.requesterDepartmentName
          ? { id: master.authDepartmentId ?? master.departmentId, name: master.requesterDepartmentName }
          : null,
      },
      items: master.items.map((i: DarDetailRaw["items"][number]) => ({
        itemNo: i.itemNo,
        docNumber: i.docNumber,
        docName: i.docName,
        revision: i.revision,
      })),
      distributions: master.distributions.map((d: DarDetailRaw["distributions"][number]) => ({
        departmentId: d.departmentId,
        department: {
          id: d.authDepartmentId ?? d.departmentId,
          name: d.departmentName ?? d.departmentId,
        },
      })),
      approvals: master.approvals.map((a: DarDetailRaw["approvals"][number]) =>
        this.mapApproval(a)
      ),
      attachments: master.attachments.map((a: DarDetailRaw["attachments"][number]): DarAttachmentRow => ({
        id: a.id,
        fileName: a.fileName,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        spItemId: a.spItemId,
        spWebUrl: a.spWebUrl,
        spDownloadUrl: a.spDownloadUrl,
        folderPath: a.folderPath,
        createdAt: a.createdAt.toISOString(),
        uploadedBy: { id: a.uploadedById, name: a.uploadedByName ?? null },
      })),
      qmsProcessing: master.qmsProcessing
        ? {
            chkHasAttachment: master.qmsProcessing.chkHasAttachment,
            chkPrintAndValidate: master.qmsProcessing.chkPrintAndValidate,
            chkRenumber: master.qmsProcessing.chkRenumber,
            chkImpactInvestigated: master.qmsProcessing.chkImpactInvestigated,
            chkSubmitVerification: master.qmsProcessing.chkSubmitVerification,
            chkGetBackProcess: master.qmsProcessing.chkGetBackProcess,
            chkCopyDistribute: master.qmsProcessing.chkCopyDistribute,
            comments: master.qmsProcessing.comments ?? null,
            processDate: master.qmsProcessing.processDate?.toISOString() ?? null,
            qmsUserId: master.qmsProcessing.qmsUserId,
            qmsAuthUserId: master.qmsProcessing.qmsAuthUserId ?? null,
            qmsUserName: master.qmsProcessing.qmsUserName ?? null,
            qmsUserEmployeeId: master.qmsProcessing.qmsUserEmployeeId ?? null,
          }
        : null,
    };
  }

  async getAllDars(): Promise<DarSummary[]> {
    const masters = await this.darRepo.findManySummary();
    return (masters as Array<{
      id: string;
      darNo: string | null;
      requestDate: Date;
      objective: string;
      docType: string;
      status: DarStatus;
      _count: { items: number };
    }>).map((r) => ({
      id: r.id,
      darNo: r.darNo,
      requestDate: r.requestDate.toISOString(),
      objective: r.objective as DarSummary["objective"],
      docType: r.docType as DarSummary["docType"],
      status: r.status,
      itemCount: r._count.items,
    }));
  }

  async getDarsByRequesterId(
    requesterId: string,
    page: number,
    limit: number
  ): Promise<{ dars: DarSummary[]; total: number }> {
    const skip = (page - 1) * limit;
    const [masters, total] = await Promise.all([
      this.darRepo.findManyByRequester(requesterId, skip, limit),
      this.darRepo.countByRequester(requesterId),
    ]);

    return {
      dars: (masters as Array<{
        id: string;
        darNo: string | null;
        requestDate: Date;
        objective: string;
        docType: string;
        status: DarStatus;
        _count: { items: number };
      }>).map((r) => ({
        id: r.id,
        darNo: r.darNo,
        requestDate: r.requestDate.toISOString(),
        objective: r.objective as DarSummary["objective"],
        docType: r.docType as DarSummary["docType"],
        status: r.status,
        itemCount: r._count.items,
      })),
      total,
    };
  }

  async getDarById(id: string, requesterId: string, isPrivileged = false): Promise<DarDetail> {
    const detail = await this.fetchDarDetail(id);
    if (!detail) throw new NotFoundError("DAR");

    const isAssignedApprover = detail.approvals.some((a) => a.assignedUser.id === requesterId);
    if (!isPrivileged && detail.requester.id !== requesterId && !isAssignedApprover) {
      throw new ForbiddenError();
    }

    return detail;
  }

  async createDar(requesterId: string, departmentId: string | null | undefined, input: CreateDarInput, authDepartmentId?: string | null): Promise<DarDetail> {
    // Resolve departmentId — prefer authDepartmentId lookup (stable code), fallback by name
    let resolvedDepartmentId = departmentId ?? authDepartmentId ?? null;
    if (!resolvedDepartmentId && authDepartmentId) {
      const byAuthId = await this.deptRepo.findByAuthDepartmentId(authDepartmentId);
      if (byAuthId) {
        resolvedDepartmentId = byAuthId.authDepartmentId;
      } else {
        const byName = await this.deptRepo.findByName(authDepartmentId);
        resolvedDepartmentId = byName?.authDepartmentId ?? null;
      }
    }
    if (!resolvedDepartmentId) throw new ValidationError("บัญชีของคุณยังไม่ได้ผูกกับแผนก");

    const requester = await this.getIdentitySnapshot(requesterId);
    if (!requester) throw new ValidationError("ไม่พบข้อมูลผู้ร้องขอ");
    const dept = await this.deptRepo.findById(resolvedDepartmentId);

    // Lookup distribution departments for snapshot fields
    const distDepts = await Promise.all(
      input.distributionDepartmentIds.map((deptId) => this.deptRepo.findById(deptId))
    );

    const newDar = await this.darRepo.create({
      objective: input.objective,
      docType: input.docType,
      docTypeOther: input.docTypeOther ?? null,
      reason: input.reason,
      status: "DRAFT" as DarStatus,
      requesterId,
      requesterAuthUserId: requester.authUserId ?? null,
      requesterName: requester.name,
      requesterEmployeeId: requester.employeeId,
      requesterEmail: requester.email,
      requesterDepartmentName: requester.department?.name ?? dept?.name ?? null,
      departmentId: resolvedDepartmentId,
      authDepartmentId: authDepartmentId ?? null,
      items: {
        create: input.items.map((item, idx) => ({
          itemNo: idx + 1,
          docNumber: item.docNumber,
          docName: item.docName,
          revision: item.revision,
        })),
      },
      distributions: {
        create: input.distributionDepartmentIds.map((deptId, idx) => ({
          departmentId: deptId,
          authDepartmentId: distDepts[idx]?.authDepartmentId ?? null,
          departmentName: distDepts[idx]?.name ?? null,
        })),
      },
    });

    if (input.tempAttachments && input.tempAttachments.length > 0 && dept) {
      await this.adoptTempAttachments({
        darId: newDar.id,
        darNo: newDar.darNo ?? newDar.id,
        uploadedById: requesterId,
        departmentName: dept.name,
        objective: input.objective,
        docType: input.docType,
        tempAttachments: input.tempAttachments,
      });
    }

    const detail = await this.fetchDarDetail(newDar.id);
    return detail!;
  }

  private async adoptTempAttachments(opts: {
    darId: string;
    darNo: string;
    uploadedById: string;
    departmentName: string;
    objective: CreateDarInput["objective"];
    docType: CreateDarInput["docType"];
    tempAttachments: TempAttachmentInput[];
  }): Promise<void> {
    const { moveSpItem, buildFolderPath } = await import("@/services/sharepoint");
    const targetPath = buildFolderPath({ departmentName: opts.departmentName, objective: opts.objective, docType: opts.docType });

    const uploaderSnapshot = await this.getIdentitySnapshot(opts.uploadedById);

    const results = await Promise.allSettled(
      opts.tempAttachments.map(async (t) => {
        const safeBase = t.fileName.replace(/[/\\:*?"<>|]/g, "_");
        const newName = `${opts.darNo}_${safeBase}`;
        const moved = await moveSpItem({ spItemId: t.spItemId, targetFolderPath: targetPath, newName });
        return { t, moved, targetPath };
      })
    );

    const toCreate = results
      .filter((r): r is PromiseFulfilledResult<MovedAttachmentResult> => r.status === "fulfilled")
      .map(({ value: { t, moved, targetPath } }) => ({
        fileName: t.fileName,
        fileSize: t.fileSize,
        mimeType: t.mimeType,
        spItemId: t.spItemId,
        spWebUrl: moved.spWebUrl,
        spDownloadUrl: moved.spDownloadUrl,
        folderPath: targetPath,
        darMasterId: opts.darId,
        uploadedById: opts.uploadedById,
        uploadedByName: uploaderSnapshot?.name ?? null,
      }));

    if (toCreate.length > 0) {
      await db.$transaction(async (tx) => {
        await this.darRepo.createAttachments(toCreate, tx);
      });
    }

    results.forEach((r, i) => {
      if (r.status === "rejected") logger.error(`[adoptTempAttachments] Failed to move temp file #${i}`, r.reason);
    });
  }

  async updateDarDraft(
    id: string,
    requesterId: string,
    input: Partial<CreateDarInput>,
    isPrivileged = false
  ): Promise<DarDetail> {
    const existing = await this.darRepo.findById(id);

    if (!existing) throw new NotFoundError("DAR");
    if (!isPrivileged && existing.requesterId !== requesterId) throw new ForbiddenError();
    if (!isPrivileged && existing.status !== "DRAFT") throw new ValidationError("Only DRAFT requests can be edited");

    await db.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {};
      if (input.objective !== undefined) updateData.objective = input.objective;
      if (input.docType !== undefined) updateData.docType = input.docType;
      if (input.docTypeOther !== undefined) updateData.docTypeOther = input.docTypeOther;
      if (input.reason !== undefined) updateData.reason = input.reason;

      if (Object.keys(updateData).length > 0) {
        await this.darRepo.update(id, updateData, tx);
      }

      if (input.items !== undefined) {
        await this.darRepo.deleteItemsByDarId(id, tx);
        if (input.items.length > 0) {
          const itemsData = input.items.map((item, idx) => ({
            itemNo: idx + 1,
            docNumber: item.docNumber,
            docName: item.docName,
            revision: item.revision,
            darMasterId: id,
          }));
          await this.darRepo.createItems(itemsData, tx);
        }
      }

      if (input.distributionDepartmentIds !== undefined) {
        await this.darRepo.deleteDistributionsByDarId(id, tx);
        if (input.distributionDepartmentIds.length > 0) {
          const distributionsData = input.distributionDepartmentIds.map((deptId) => ({
            darMasterId: id,
            departmentId: deptId,
          }));
          await this.darRepo.createDistributions(distributionsData, tx);
        }
      }
    });

    const detail = await this.fetchDarDetail(id);
    return detail!;
  }

  private async generateDarNo(deptCode: string, tx: Prisma.TransactionClient): Promise<string> {
    const format = await getDocNoFormat("DAR");
    const year = new Date().getFullYear();
    const { likePrefix } = buildLikePrefix(format, { dept: deptCode, year });
    // ponytail: two-arg advisory lock avoids hashtext 32-bit collision; serializes concurrent submits per prefix
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(1984512301, hashtext(${`dar_no_gen_${likePrefix}`}))`;
    const escPrefix = likePrefix.replace(/[$()*+.[\\\]^{|}?]/g, "\\$&");
    const regexPattern = `^${escPrefix}[0-9]+$`;
    const startPos = likePrefix.length + 1;
    const rows = await tx.$queryRaw<{ next_seq: number }[]>`
      SELECT COALESCE(MAX(
        CASE WHEN "darNo" ~ ${regexPattern}
          THEN CAST(SUBSTR("darNo", ${startPos}) AS INTEGER)
          ELSE 0 END
      ), 0) + 1 AS next_seq
      FROM "DarMaster"
      WHERE "darNo" LIKE ${`${likePrefix}%`}
    `;
    const next = rows[0]?.next_seq ?? 1;
    const darNo = renderDocNo(format, { dept: deptCode, year, seq: next });
    logger.info(`[generateDarNo] format=${format} dept=${deptCode} prefix=${likePrefix} next=${next} result=${darNo}`);
    return darNo;
  }

  async submitDar(id: string, actor: ActorIdentity): Promise<DarDetail> {
    const requesterId = actor.userId;
    const existing = await this.darRepo.findById(id);

    if (!existing) throw new NotFoundError("DAR");
    const submitAuthId = (existing as Record<string, unknown>).requesterAuthUserId as string | null | undefined;
    // ponytail: match either authUserId or legacy local requesterId — old DARs may have null requesterAuthUserId
    const isSubmitOwner =
      (actor.authUserId && submitAuthId && submitAuthId === actor.authUserId) ||
      existing.requesterId === actor.userId ||
      existing.requesterId === actor.authUserId;
    if (!isSubmitOwner) throw new ForbiddenError();
    if (existing.status !== "DRAFT") throw new ValidationError("Only DRAFT requests can be submitted");

    const authDeptId = (existing as Record<string, unknown>).authDepartmentId as string | null | undefined;
    const deptCodeRow = authDeptId ? await this.deptCodeRepo.findByAuthDeptId(authDeptId) : null;
    const deptCode = deptCodeRow?.code ?? "GEN";

    // ponytail: retry on darNo unique conflict — concurrent submits can race past advisory lock
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await db.$transaction(async (tx) => {
          const requester = await this.getIdentitySnapshot(requesterId, tx);
          // ponytail: reuse existing darNo on resubmit after reject — avoids re-sequencing
          const darNo = (existing as Record<string, unknown>).darNo as string | null ?? await this.generateDarNo(deptCode, tx);
          await this.darRepo.update(id, { status: "PENDING_REVIEW" as DarStatus, darNo, requesterAuthUserId: actor.authUserId ?? null }, tx);
          await this.darRepo.deleteApprovalsByDarId(id, tx);
          await this.approvalSignatureRepo.deleteByDocument("DAR", id, tx);
          await this.darRepo.createApproval(
            {
              stepRole: "PREPARER",
              action: "PENDING",
              assignedUserId: requesterId,
              assignedAuthUserId: actor.authUserId ?? null,
              assignedUserName: requester?.name ?? null,
              assignedEmployeeId: requester?.employeeId ?? null,
              assignedDepartmentName: requester?.department?.name ?? null,
              darMasterId: id,
            },
            tx
          );
          await this.approvalSignatureRepo.upsertStep(
            {
              module: "DAR",
              documentId: id,
              step: "PREPARER",
              signerUserId: requesterId,
              signerAuthUserId: actor.authUserId ?? null,
              signerName: requester?.name ?? null,
              signerEmail: requester?.email ?? null,
              signerDepartmentName: requester?.department?.name ?? null,
              action: "PENDING",
            },
            tx
          );
        });
        break; // success
      } catch (err: unknown) {
        const isUniqueConflict =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
        if (!isUniqueConflict || attempt === 4) throw err;
        logger.warn(`[submitDar] darNo unique conflict on attempt ${attempt}, retrying in ${100 * (attempt + 1)}ms`);
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
      }
    }

    const detail = await this.fetchDarDetail(id);
    if (!detail) throw new NotFoundError("DAR");
    return detail;
  }

  async assignReviewer(darId: string, requester: ActorIdentity, reviewerUserId: string): Promise<DarDetail> {
    const dar = await this.darRepo.findById(darId);

    if (!dar) throw new NotFoundError("DAR");
    const darAuthUserId = (dar as Record<string, unknown>).requesterAuthUserId as string | null | undefined;
    // ponytail: match either authUserId or legacy local requesterId
    const isOwner =
      (requester.authUserId && darAuthUserId && darAuthUserId === requester.authUserId) ||
      dar.requesterId === requester.userId ||
      dar.requesterId === requester.authUserId;
    if (!isOwner) throw new ForbiddenError();
    if (dar.status !== "PENDING_REVIEW") throw new ValidationError("DAR must be in PENDING_REVIEW status");

    const currentApprovals = await this.darRepo.findApprovalsByDarId(darId);
    const preparer = currentApprovals.find((a) => a.stepRole === "PREPARER");
    if (!preparer || preparer.action !== "APPROVED") throw new ValidationError("Preparer must approve before assigning a reviewer");

    const reviewerSnapshot = await this.getIdentitySnapshot(reviewerUserId);

    await db.$transaction(async (tx) => {
      await this.darRepo.deleteApprovalsByDarIdExceptPreparer(darId, tx);
      await this.darRepo.createApproval(
        {
          stepRole: "REVIEWER",
          action: "PENDING",
          assignedUserId: reviewerUserId,
          assignedAuthUserId: reviewerSnapshot?.authUserId ?? reviewerUserId,
          assignedUserName: reviewerSnapshot?.name ?? null,
          assignedEmployeeId: reviewerSnapshot?.employeeId ?? null,
          assignedDepartmentName: reviewerSnapshot?.department?.name ?? null,
          darMasterId: darId,
        },
        tx
      );
      await this.approvalSignatureRepo.upsertStep(
        {
          module: "DAR",
          documentId: darId,
          step: "REVIEWER",
          signerUserId: reviewerUserId,
          signerAuthUserId: reviewerSnapshot?.authUserId ?? reviewerUserId,
          signerName: reviewerSnapshot?.name ?? null,
          signerEmail: reviewerSnapshot?.email ?? null,
          signerDepartmentName: reviewerSnapshot?.department?.name ?? null,
          action: "PENDING",
        },
        tx
      );
    });

    const detail = await this.fetchDarDetail(darId);

    return detail!;
  }

  async approveDar(darId: string, actor: ActorIdentity, input: ApproveDarInput): Promise<DarDetail> {
    const userId = actor.userId;
    const dar = await this.darRepo.findById(darId);
    if (!dar) throw new NotFoundError("DAR");

    const currentApprovals = await this.darRepo.findApprovalsByDarId(darId);
    const myStep = currentApprovals.find((a) => {
      if (a.action !== "PENDING") return false;
      // Prefer authUserId match when both sides are populated
      if (actor.authUserId && a.assignedAuthUserId) return a.assignedAuthUserId === actor.authUserId;
      return a.assignedUserId === userId;
    });
    if (!myStep) throw new ForbiddenError("No pending approval step assigned to you");

    if (myStep.stepRole === "PREPARER" && dar.status !== "PENDING_REVIEW") throw new ValidationError("Invalid DAR status for PREPARER approval");
    if (myStep.stepRole === "REVIEWER" && dar.status !== "PENDING_REVIEW") throw new ValidationError("Invalid DAR status for REVIEWER approval");
    if (myStep.stepRole === "APPROVER_MR" && dar.status !== "PENDING_APPROVE") throw new ValidationError("Invalid DAR status for MR approval");
    if (myStep.stepRole === "QMS_PROCESSOR" && dar.status !== "QMS_PROCESSING") throw new ValidationError("Invalid DAR status for QMS approval");
    // QMS checklist is optional for approval; if provided, it will be saved.

    let nextStatus: DarStatus = dar.status;
    let createMrStep = false;

    if (myStep.stepRole === "PREPARER") {
      nextStatus = "PENDING_REVIEW" as DarStatus;
    } else if (myStep.stepRole === "REVIEWER") {
      nextStatus = "PENDING_APPROVE" as DarStatus;
      createMrStep = true;
    } else if (myStep.stepRole === "APPROVER_MR") {
      nextStatus = "QMS_PROCESSING" as DarStatus;
    } else if (myStep.stepRole === "QMS_PROCESSOR") {
      nextStatus = "COMPLETED" as DarStatus;
    }

    let mrUser: { authUserId: string } | null = null;
    let qmsUser: { authUserId: string } | null = null;
    if (createMrStep) {
      if (input.targetAuthUserId) {
        mrUser = { authUserId: input.targetAuthUserId };
      } else {
        mrUser = await this.resolveDesignatedUser("CURRENT_MR_AUTH_USER_ID", "CURRENT_MR_USER_ID", "QMS_MR", actor.accessToken);
      }
      if (!mrUser) throw new AppError("MR user is not configured. Please select an MR user.", 400, "MR_NOT_CONFIGURED");
    }
    if (myStep.stepRole === "APPROVER_MR") {
      if (input.targetAuthUserId) {
        qmsUser = { authUserId: input.targetAuthUserId };
      } else {
        qmsUser = await this.resolveDesignatedUser(
          "CURRENT_QMS_AUTH_USER_ID",
          "CURRENT_QMS_USER_ID",
          "QMS_QMS",
          actor.accessToken,
        );
      }
      if (!qmsUser) throw new AppError("QMS signer is not configured in the system", 400, "QMS_NOT_CONFIGURED");
    }

    const actorSnapshot = await this.getIdentitySnapshot(userId);
    const mrSnapshot = mrUser ? await this.getIdentitySnapshot(mrUser.authUserId) : null;
    const qmsSnapshot = qmsUser ? await this.getIdentitySnapshot(qmsUser.authUserId) : null;

    const now = new Date();
    await db.$transaction(async (tx) => {
      await this.darRepo.updateApproval(
        myStep.id,
        {
          action: "APPROVED",
          actionDate: now,
          signatureUsedUrl: input.signatureDataUrl,
          signatureTypeUsed: input.signatureType,
          comment: input.comment ?? null,
        },
        tx
      );
      await this.approvalSignatureRepo.upsertStep(
        {
          module: "DAR",
          documentId: darId,
          step: myStep.stepRole,
          signerUserId: userId,
          signerAuthUserId: actor.authUserId ?? null,
          signerName: actorSnapshot?.name ?? null,
          signerEmail: actorSnapshot?.email ?? null,
          signerDepartmentName: actorSnapshot?.department?.name ?? null,
          action: "APPROVED",
          actionDate: now,
          signaturePath: input.signatureDataUrl,
          comment: input.comment ?? null,
        },
        tx
      );

      if (input.saveSignature) {
        await this.userPrefRepo.upsertSignature(
          userId,
          { savedSignatureUrl: input.signatureDataUrl, signatureType: input.signatureType },
          tx,
        );
      }

      if (createMrStep && mrUser) {
        await this.darRepo.createApproval(
          {
            stepRole: "APPROVER_MR",
            action: "PENDING",
            assignedUserId: mrUser.authUserId,
            assignedAuthUserId: mrUser.authUserId ?? null,
            assignedUserName: mrSnapshot?.name ?? null,
            assignedEmployeeId: mrSnapshot?.employeeId ?? null,
            assignedDepartmentName: mrSnapshot?.department?.name ?? null,
            darMasterId: darId,
          },
          tx
        );
        await this.approvalSignatureRepo.upsertStep(
          {
            module: "DAR",
            documentId: darId,
            step: "APPROVER_MR",
            signerUserId: mrUser.authUserId,
            signerAuthUserId: mrUser.authUserId ?? null,
            signerName: mrSnapshot?.name ?? null,
            signerEmail: mrSnapshot?.email ?? null,
            signerDepartmentName: mrSnapshot?.department?.name ?? null,
            action: "PENDING",
          },
          tx
        );
      }

      if (myStep.stepRole === "APPROVER_MR" && qmsUser) {
        await this.darRepo.createApproval(
          {
            stepRole: "QMS_PROCESSOR",
            action: "PENDING",
            assignedUserId: qmsUser.authUserId,
            assignedAuthUserId: qmsUser.authUserId ?? null,
            assignedUserName: qmsSnapshot?.name ?? null,
            assignedEmployeeId: qmsSnapshot?.employeeId ?? null,
            assignedDepartmentName: qmsSnapshot?.department?.name ?? null,
            darMasterId: darId,
          },
          tx
        );
        await this.approvalSignatureRepo.upsertStep(
          {
            module: "DAR",
            documentId: darId,
            step: "QMS_PROCESSOR",
            signerUserId: qmsUser.authUserId,
            signerAuthUserId: qmsUser.authUserId ?? null,
            signerName: qmsSnapshot?.name ?? null,
            signerEmail: qmsSnapshot?.email ?? null,
            signerDepartmentName: qmsSnapshot?.department?.name ?? null,
            action: "PENDING",
          },
          tx
        );
      }

      if (myStep.stepRole === "QMS_PROCESSOR" && input.qmsProcessing) {
        await this.qmsProcessingRepo.upsertByDarMasterId(
          {
            darMasterId: darId,
            qmsUserId: userId,
            qmsAuthUserId: actor.authUserId ?? null,
            qmsUserName: actorSnapshot?.name ?? null,
            qmsUserEmployeeId: actorSnapshot?.employeeId ?? null,
            chkHasAttachment: input.qmsProcessing.chkHasAttachment,
            chkPrintAndValidate: input.qmsProcessing.chkPrintAndValidate,
            chkRenumber: input.qmsProcessing.chkRenumber,
            chkImpactInvestigated: input.qmsProcessing.chkImpactInvestigated,
            chkSubmitVerification: input.qmsProcessing.chkSubmitVerification,
            chkGetBackProcess: input.qmsProcessing.chkGetBackProcess,
            chkCopyDistribute: input.qmsProcessing.chkCopyDistribute,
            comments: input.qmsProcessing.comments ?? null,
            processDate: now,
          },
          tx
        );
      }

      await this.darRepo.update(darId, { status: nextStatus }, tx);

      await AuditService.record({
        actorUserId: userId,
        actorAuthUserId: actor.authUserId,
        actorRole: myStep.stepRole,
        action: "APPROVE",
        resourceType: "DAR",
        resourceId: darId,
        before: { status: dar.status },
        after:  { status: nextStatus },
        metadata: { step: myStep.stepRole },
      }, tx);
    });

    const detail = await this.fetchDarDetail(darId);

    if (myStep.stepRole === 'QMS_PROCESSOR') {
      // Completed — notify requester's dept
      const completedDeptId = (dar as Record<string, unknown>).authDepartmentId as string | null | undefined;
      if (completedDeptId && actor.accessToken) {
        NotificationService.notifyDeptMembers(completedDeptId, actor.accessToken, {
          title: 'DAR เสร็จสมบูรณ์', body: `DAR ${dar.darNo ?? darId} เสร็จสมบูรณ์แล้ว`,
          module: 'DAR', resourceId: darId, resourceType: 'DAR',
        }).catch(() => {});
      }
    }

    return detail!;
  }

  async rejectDar(darId: string, actor: ActorIdentity, comment: string): Promise<DarDetail> {
    const userId = actor.userId;
    const dar = await this.darRepo.findById(darId);
    if (!dar) throw new NotFoundError("DAR");

    const myStep = await this.darRepo.findPendingApproval(darId, userId, actor.authUserId);
    if (!myStep) throw new ForbiddenError("No pending approval step assigned to you");

    const now = new Date();
    const actorSnapshot = await this.getIdentitySnapshot(userId);
    await db.$transaction(async (tx) => {
      await this.darRepo.updateApproval(myStep.id, { action: "REJECTED", actionDate: now, comment }, tx);
      await this.approvalSignatureRepo.upsertStep(
        {
          module: "DAR",
          documentId: darId,
          step: myStep.stepRole,
          signerUserId: userId,
          signerAuthUserId: actor.authUserId ?? null,
          signerName: actorSnapshot?.name ?? null,
          signerEmail: actorSnapshot?.email ?? null,
          signerDepartmentName: actorSnapshot?.department?.name ?? null,
          action: "REJECTED",
          actionDate: now,
          comment,
        },
        tx
      );
      await this.darRepo.update(darId, { status: "DRAFT" as DarStatus }, tx);

      await AuditService.record({
        actorUserId: userId,
        actorAuthUserId: actor.authUserId,
        actorRole: myStep.stepRole,
        action: "REJECT",
        resourceType: "DAR",
        resourceId: darId,
        before: { status: dar.status },
        after:  { status: "DRAFT" },
        metadata: { step: myStep.stepRole, comment },
      }, tx);
    });

    const detail = await this.fetchDarDetail(darId);

    // Notify requester
    const rejectedRequesterAuthId = (dar as Record<string, unknown>).requesterAuthUserId as string | null | undefined;
    if (rejectedRequesterAuthId) {
      NotificationService.createInAppNotification({
        recipientId: rejectedRequesterAuthId,
        title: 'DAR ถูกปฏิเสธ',
        body: `DAR ${dar.darNo ?? darId} ถูกปฏิเสธโดย ${myStep.stepRole}`,
        module: 'DAR', resourceId: darId, resourceType: 'DAR',
      }).catch(() => {});
    }

    return detail!;
  }

  async getReviewerCandidates(accessToken?: string | null): Promise<ReviewerCandidate[]> {
    const CACHE_KEY = "qms:dar:reviewer_candidates";
    const CACHE_TTL = 120;

    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return JSON.parse(cached) as ReviewerCandidate[];
    } catch { /* Redis unavailable */ }

    const { listAuthCenterUsers } = await import("@/lib/auth-center-admin-client");
    const authUsers = await listAuthCenterUsers({ accessToken });

    const result: ReviewerCandidate[] = authUsers
      .filter((u) => u.id && u.email)
      .map((u) => ({
        id: u.id,
        name: u.displayName ?? null,
        email: u.email!,
        employeeId: u.employeeId ?? null,
        msUserId: null,
        department: u.department ? { id: u.department, name: u.department } : null,
      }));

    try {
      await redis.set(CACHE_KEY, JSON.stringify(result), "EX", CACHE_TTL);
    } catch { /* non-fatal */ }

    return result;
  }

  async deleteDar(id: string, actor: ActorIdentity, isPrivileged = false): Promise<void> {
    const requesterId = actor.userId;
    const dar = await this.darRepo.findById(id);

    if (!dar) throw new NotFoundError("DAR");
    const deleteAuthId = (dar as Record<string, unknown>).requesterAuthUserId as string | null | undefined;
    const isDeleteOwner = (actor.authUserId && deleteAuthId) ? deleteAuthId === actor.authUserId : dar.requesterId === requesterId;
    if (!isPrivileged && !isDeleteOwner) throw new ForbiddenError();
    if (!isPrivileged && dar.status !== "DRAFT") throw new ValidationError("Only DRAFT DAR can be deleted");

    const attachments = await this.darRepo.findAttachmentsByDarId(id);

    await db.$transaction(async (tx) => {
      await this.darRepo.deleteApprovalsByDarId(id, tx);
      await this.approvalSignatureRepo.deleteByDocument("DAR", id, tx);
      await this.darRepo.deleteAttachmentsByDarId(id, tx);
      await this.darRepo.deleteItemsByDarId(id, tx);
      await this.darRepo.deleteDistributionsByDarId(id, tx);
      await this.darRepo.delete(id, tx);

      await AuditService.record({
        actorUserId: requesterId,
        actorAuthUserId: actor.authUserId,
        actorRole: isPrivileged ? "QMS" : "USER",
        action: "DELETE",
        resourceType: "DAR",
        resourceId: id,
        before: { status: dar.status, darNo: dar.darNo },
      }, tx);
    });

    if (attachments.length > 0) {
      const { deleteSpItem } = await import("@/services/sharepoint");
      await Promise.allSettled(attachments.map((a) => deleteSpItem(a.spItemId)));
    }
  }

  async getSavedSignature(authUserId: string): Promise<{ url: string; type: SignatureType } | null> {
    const pref = await this.userPrefRepo.findByAuthUserId(authUserId);
    if (!pref?.savedSignatureUrl || !pref.signatureType) return null;
    return { url: pref.savedSignatureUrl, type: pref.signatureType };
  }

  private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024;
  private static readonly ALLOWED_MIME = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png", "image/jpeg", "image/gif", "image/webp",
  ]);

  private static hasValidMagicBytes(buffer: Uint8Array, mimeType: string): boolean {
    if (buffer.length < 12) return false;
    const b = buffer;
    switch (mimeType) {
      case "application/pdf":
        return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
      case "image/png":
        return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
      case "image/jpeg":
        return b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
      case "image/gif":
        return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38;
      case "image/webp":
        return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
               b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        return b[0] === 0x50 && b[1] === 0x4B;
      case "application/msword":
      case "application/vnd.ms-excel":
        return b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0;
      default:
        return false;
    }
  }

  async uploadAttachment(
    darId: string,
    file: File,
    uploaderId: string,
    uploaderRole: string
  ): Promise<DarAttachmentRow> {
    const dar = await this.darRepo.findDarForAttachmentUpload(darId);
    if (!dar) throw new NotFoundError("DAR");

    const isPrivileged = uploaderRole === "QMS" || uploaderRole === "MR";
    const isAssigned = dar.approvals.some((a) => a.assignedUserId === uploaderId);
    if (!isPrivileged && dar.requesterId !== uploaderId && !isAssigned) throw new ForbiddenError();

    if (dar.status === "COMPLETED" || dar.status === "CANCELLED") {
      throw new ValidationError("ไม่สามารถเพิ่มไฟล์ในคำขอที่เสร็จสิ้นหรือยกเลิกแล้ว");
    }

    if (file.size > DarService.MAX_FILE_SIZE) throw new ValidationError("ไฟล์ต้องมีขนาดไม่เกิน 20 MB");
    if (!DarService.ALLOWED_MIME.has(file.type)) throw new ValidationError("ประเภทไฟล์ไม่รองรับ");

    const buffer = new Uint8Array(await file.arrayBuffer());
    if (!DarService.hasValidMagicBytes(buffer, file.type)) {
      throw new ValidationError("เนื้อหาไฟล์ไม่ตรงกับประเภทที่ระบุ");
    }

    const uploaderSnapshot = await this.getIdentitySnapshot(uploaderId);

    const sp = await uploadFileToDar({
      fileBuffer: buffer,
      fileName: file.name,
      mimeType: file.type,
      darNo: dar.darNo ?? darId,
      departmentName: dar.requesterDepartmentName ?? "",
      objective: dar.objective as Parameters<typeof uploadFileToDar>[0]["objective"],
      docType: dar.docType as Parameters<typeof uploadFileToDar>[0]["docType"],
    });

    let attachment;
    try {
      attachment = await this.darRepo.createAttachment({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        spItemId: sp.spItemId,
        spWebUrl: sp.spWebUrl,
        spDownloadUrl: sp.spDownloadUrl,
        folderPath: sp.folderPath,
        darMasterId: darId,
        uploadedById: uploaderId,
        uploadedByName: uploaderSnapshot?.name ?? null,
      });
    } catch (dbErr) {
      logger.error("[DarService.uploadAttachment] DB insert failed after SP upload. Compensating by deleting SP item.", dbErr);
      try {
        await deleteSpItem(sp.spItemId);
      } catch (delErr) {
        logger.error(`[DarService.uploadAttachment] Compensation SP delete also failed for item: ${sp.spItemId}`, delErr);
      }
      throw dbErr;
    }

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      spItemId: attachment.spItemId,
      spWebUrl: attachment.spWebUrl,
      spDownloadUrl: attachment.spDownloadUrl,
      folderPath: attachment.folderPath,
      createdAt: attachment.createdAt.toISOString(),
      uploadedBy: { id: uploaderId, name: uploaderSnapshot?.name ?? null },
    };
  }

  async deleteAttachment(
    darId: string,
    attachmentId: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    const attachment = await this.darRepo.findAttachmentById(attachmentId);
    if (!attachment || attachment.darMasterId !== darId) throw new NotFoundError("ไฟล์แนบ");

    const dar = await this.darRepo.findDarStatusAndRequester(darId);
    if (!dar) throw new NotFoundError("DAR");

    const isPrivileged = userRole === "QMS" || userRole === "MR";
    const isOwner = attachment.uploadedById === userId || dar.requesterId === userId;
    if (!isPrivileged && !isOwner) throw new ForbiddenError();

    if (dar.status === "COMPLETED" || dar.status === "CANCELLED") {
      throw new ValidationError("ไม่สามารถลบไฟล์ในคำขอที่เสร็จสิ้นหรือยกเลิกแล้ว");
    }

    try {
      await deleteSpItem(attachment.spItemId);
    } catch (spErr) {
      logger.error("[DarService.deleteAttachment] SharePoint delete failed (continuing)", spErr);
    }

    await this.darRepo.deleteAttachmentById(attachmentId);
  }

  async getPreviewFileInfo(
    spItemId: string,
    userId: string,
    userRole: string
  ): Promise<{ downloadUrl: string; mimeType: string; name: string }> {
    const isPrivileged = userRole === "QMS" || userRole === "MR" || userRole === "IT";

    if (!isPrivileged) {
      const attachment = await this.darRepo.findAttachmentBySpItemId(spItemId);
      if (!attachment) throw new NotFoundError("File");

      const dar = await this.darRepo.findDarStatusAndRequester(attachment.darMasterId);
      const isRequester = dar?.requesterId === userId;
      if (!isRequester) {
        const assigned = await this.darRepo.findApprovalByDarAndUser(attachment.darMasterId, userId);
        if (!assigned) throw new ForbiddenError();
      }
    }

    const info = await getFileInfo(spItemId);
    if (!info.downloadUrl) throw new ValidationError("File not available");

    return { downloadUrl: info.downloadUrl, mimeType: info.mimeType, name: info.name };
  }
}
