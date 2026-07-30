import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError, ForbiddenError } from "@/errors/customErrors";
import { DocumentDistributionRepository } from "@/repositories/documentDistributionRepository";
import { DepartmentCodeRepository } from "@/repositories/departmentCodeRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { DarRepository } from "@/repositories/darRepository";
import { DocumentControlRepository } from "@/repositories/documentControlRepository";
import { getFileInfo } from "@/lib/sharepoint";
import { getFilePdfRendition, uploadFileToDistribution } from "@/services/sharepoint";
import { bakeStampImage, bakeDynamicFields, isStampImageKey, type PctBox, type StampImageKey } from "@/services/pdfStampService";
import { isPrivilegedQmsRole } from "@/lib/qms-roles";
import { getUserSnapshot } from "@/lib/userSnapshotCache";
import { sendMail, makeBilingualMail } from "@/services/email";
import { db } from "@/lib/db";
import { DocumentControlService } from "@/services/documentControlService";

export type PublishDistributionInput = {
  revisionId: string;
  stampImageKey: string;
  stampImageBox: PctBox | PctBox[];
  dateFieldBox: PctBox | PctBox[];
  copyToFieldBox: PctBox | PctBox[];
  targetDepartmentIds: string[];
  linkToDocumentControl: boolean;
  createRevisionOnPublish?: boolean;
};

export type UpdateDistributionInput = {
  stampImageKey?: string;
  stampImageBox?: PctBox | PctBox[];
  dateFieldBox?: PctBox | PctBox[];
  copyToFieldBox?: PctBox | PctBox[];
  targetDepartmentIds?: string[];
};

const DAR_DOC_TYPE_TO_CATEGORY: Record<string, string> = {
  MANUAL: "M",
  PROCEDURE: "P",
  SOP: "SOP",
  DRAWING: "Drawing",
  SIP: "SIP",
  IPQC: "IPQC",
};

export class DocumentDistributionService {
  private repo = new DocumentDistributionRepository();
  private deptCodeRepo = new DepartmentCodeRepository();
  private departmentRepo = new DepartmentRepository();
  private darRepo = new DarRepository();
  private docControlRepo = new DocumentControlRepository();
  private docControlService = new DocumentControlService();

  private async getIdentitySnapshot(userId: string) {
    const cached = await getUserSnapshot(userId);
    return cached ? { name: cached.name } : null;
  }

  async publish(
    darId: string,
    actor: { userId: string; role: string; authUserId?: string | null },
    input: PublishDistributionInput,
  ) {
    if (!isPrivilegedQmsRole(actor.role)) throw new ForbiddenError();
    if (!isStampImageKey(input.stampImageKey)) throw new ValidationError("รูปแบบตราประทับไม่ถูกต้อง");
    if (!input.targetDepartmentIds.length) throw new ValidationError("กรุณาเลือกแผนกที่ต้องแจกจ่ายอย่างน้อย 1 แผนก");

    const dar = await this.darRepo.findDarNoAndStatus(darId);
    if (!dar) throw new NotFoundError("DAR");
    if (dar.status !== "COMPLETED") throw new ValidationError("ต้องเป็น DAR ที่เสร็จสิ้นแล้วเท่านั้นจึงจะแจกจ่ายได้");

    if (input.createRevisionOnPublish) {
      const selected = await this.docControlRepo.findRevisionForDistribution(input.revisionId);
      if (!selected) throw new NotFoundError("Selected document revision");
      const linkedDocument = await this.docControlRepo.findDetailById(selected.documentControlId);
      const existingNextRevision = linkedDocument?.revisions.find((item) => item.id !== selected.id && item.darMasterId === darId && item.spItemId);
      if (existingNextRevision) {
        input.revisionId = existingNextRevision.id;
      } else {
        if (!selected.spItemId) throw new ValidationError("Selected document has no source file for the next revision");
        const info = await getFileInfo(selected.spItemId);
        const pdfBuffer = await this.fetchSourcePdfBuffer(selected.spItemId, info.mimeType);
        const pdfFileName = `${(info.name || selected.fileName || selected.documentControl.docNumber).replace(/\.[^.]+$/, "")}.pdf`;
        const nextRevision = await this.docControlService.nextRevision(selected.documentControlId);
        await this.docControlService.addRevision(
          selected.documentControlId,
          actor.userId,
          { revision: nextRevision, status: "ACTIVE", darMasterId: darId },
          { buffer: pdfBuffer, name: pdfFileName, type: "application/pdf" },
          actor.authUserId,
        );
        const refreshed = await this.docControlRepo.findDetailById(selected.documentControlId);
        const createdRevision = refreshed?.revisions.find((item) => item.revision === nextRevision && item.darMasterId === darId);
        if (!createdRevision) throw new ValidationError("Failed to create the next document revision");
        input.revisionId = createdRevision.id;
      }
    }

    const revision = await this.docControlRepo.findRevisionForDistribution(input.revisionId);
    if (!revision || revision.darMasterId !== darId) throw new NotFoundError("รุ่นเอกสาร");
    if (!revision.spItemId) throw new ValidationError("รุ่นเอกสารนี้ไม่มีไฟล์แนบ");

    const existing = await this.repo.findByRevisionId(revision.id);
    if (existing) throw new ValidationError("เอกสารรุ่นนี้ถูกแจกจ่ายไปแล้ว");

    const allDepartments = await this.deptCodeRepo.findAll();
    const targetDepts = allDepartments.filter((d) => input.targetDepartmentIds.includes(d.id));
    if (targetDepts.length !== input.targetDepartmentIds.length) {
      throw new ValidationError("พบแผนกที่ไม่ถูกต้องในรายการที่เลือก");
    }

    const sourceBuffer = await this.fetchSourcePdfBuffer(revision.spItemId, revision.mimeType);
    const stampedBuffer = await bakeStampImage(sourceBuffer, input.stampImageKey as StampImageKey, input.stampImageBox);

    const pdfFileName = `${(revision.fileName ?? revision.documentControl.docNumber).replace(/\.[^.]+$/, "")}.pdf`;
    const sp = await uploadFileToDistribution({
      fileBuffer: stampedBuffer,
      fileName: pdfFileName,
      mimeType: "application/pdf",
      darNo: dar.darNo ?? darId,
      suffix: "base",
    });

    const actorSnapshot = actor.authUserId ? await this.getIdentitySnapshot(actor.authUserId) : null;

    const distribution = await this.repo.create({
      darMasterId: darId,
      revisionId: revision.id,
      stampImageKey: input.stampImageKey,
      stampImageBox: input.stampImageBox,
      dateFieldBox: input.dateFieldBox,
      copyToFieldBox: input.copyToFieldBox,
      basePdfSpItemId: sp.spItemId,
      basePdfSpWebUrl: sp.spWebUrl,
      linkToDocumentControl: input.linkToDocumentControl,
      publishedById: actor.userId,
      publishedByAuthUserId: actor.authUserId ?? null,
      publishedByName: actorSnapshot?.name ?? null,
      targets: targetDepts.map((d) => ({
        departmentId: d.id,
        departmentCode: d.code,
        departmentName: d.departmentName,
      })),
    });

    this.notifyTargets(targetDepts, dar, revision.documentControl.docNumber, revision.documentControl.docName).catch((err) =>
      logger.error("[DocumentDistributionService.publish] notify failed (continuing)", err),
    );

    return distribution;
  }

  private async fetchSourcePdfBuffer(spItemId: string, mimeType: string | null): Promise<Buffer> {
    if (mimeType === "application/pdf") {
      const info = await getFileInfo(spItemId);
      if (!info.downloadUrl) throw new ValidationError("ไม่พบไฟล์ต้นฉบับใน SharePoint");
      const res = await fetch(info.downloadUrl);
      if (!res.ok) throw new ValidationError("ดาวน์โหลดไฟล์ต้นฉบับไม่สำเร็จ");
      return Buffer.from(await res.arrayBuffer());
    }
    return getFilePdfRendition(spItemId);
  }

  private async notifyTargets(
    targetDepts: { authDeptId: string; departmentName: string }[],
    dar: { darNo: string | null },
    docNumber: string,
    docName: string,
  ) {
    for (const dept of targetDepts) {
      const deptInfo = await this.departmentRepo.findByAuthDepartmentId(dept.authDeptId).catch(() => null);
      if (!deptInfo?.emailGroup) continue;
      const bodyHtml = makeBilingualMail({
        titleTh: "มีเอกสารรอการรับทราบ/ดาวน์โหลด",
        titleEn: "Document ready for acknowledgement",
        facts: [
          { labelTh: "เลขที่ DAR", labelEn: "DAR No.", value: dar.darNo ?? "-" },
          { labelTh: "เลขที่เอกสาร", labelEn: "Document No.", value: docNumber },
          { labelTh: "ชื่อเอกสาร", labelEn: "Document Name", value: docName },
          { labelTh: "แผนก", labelEn: "Department", value: dept.departmentName },
        ],
      });
      await sendMail({
        to: [{ name: dept.departmentName, email: deptInfo.emailGroup }],
        subject: `[QMS] เอกสารรอการรับทราบ ${dar.darNo ?? ""}`.trim(),
        bodyHtml,
      });
    }
  }

  async listByDar(darId: string) {
    return this.repo.findManyByDarId(darId);
  }

  async listAll() {
    return this.repo.findAllRecent();
  }

  async getById(id: string) {
    const distribution = await this.repo.findById(id);
    if (!distribution) throw new NotFoundError("การแจกจ่ายเอกสาร");
    return distribution;
  }

  // Same as getById, but also carries "myTarget" so the detail page can show
  // a Download button for the caller's own department too, not just the list page.
  async getByIdForUser(id: string, authDepartmentId?: string | null) {
    const [distribution, myDeptCode] = await Promise.all([
      this.getById(id),
      authDepartmentId ? this.deptCodeRepo.findByAuthDeptId(authDepartmentId) : Promise.resolve(null),
    ]);
    return {
      ...distribution,
      myTarget: myDeptCode ? distribution.targets.find((t) => t.departmentId === myDeptCode.id) ?? null : null,
    };
  }

  async update(
    id: string,
    actor: { role: string },
    input: UpdateDistributionInput,
  ) {
    if (!isPrivilegedQmsRole(actor.role)) throw new ForbiddenError();
    const distribution = await this.getById(id);
    const downloadedTargets = distribution.targets.filter((target) => target.downloadedAt);

    if (input.stampImageKey !== undefined && !isStampImageKey(input.stampImageKey)) {
      throw new ValidationError("รูปแบบตราประทับไม่ถูกต้อง");
    }

    const targetDepartmentIds = input.targetDepartmentIds;
    if (targetDepartmentIds !== undefined) {
      if (!targetDepartmentIds.length) throw new ValidationError("ต้องมีแผนกที่ต้องแจกจ่ายอย่างน้อย 1 แผนก");
      if (new Set(targetDepartmentIds).size !== targetDepartmentIds.length) {
        throw new ValidationError("พบแผนกซ้ำในรายการแจกจ่าย");
      }
      const allDepartments = await this.deptCodeRepo.findAll();
      const selected = allDepartments.filter((department) => targetDepartmentIds.includes(department.id));
      if (selected.length !== targetDepartmentIds.length) throw new ValidationError("พบแผนกที่ไม่ถูกต้องในรายการแจกจ่าย");
      const removedDownloaded = downloadedTargets.some((target) => !targetDepartmentIds.includes(target.departmentId));
      if (removedDownloaded) throw new ValidationError("ไม่สามารถลบแผนกที่ดาวน์โหลดเอกสารไปแล้ว");
    }

    const stampChanged = input.stampImageKey !== undefined || input.stampImageBox !== undefined;
    let basePdfSpItemId: string | undefined;
    let basePdfSpWebUrl: string | undefined;
    if (stampChanged) {
      if (!distribution.revision.spItemId) throw new ValidationError("ไม่พบไฟล์ต้นฉบับสำหรับสร้าง PDF ใหม่");
      const sourceBuffer = await this.fetchSourcePdfBuffer(distribution.revision.spItemId, distribution.revision.mimeType);
      const stampedBuffer = await bakeStampImage(
        sourceBuffer,
        (input.stampImageKey ?? distribution.stampImageKey) as StampImageKey,
        input.stampImageBox ?? distribution.stampImageBox as PctBox | PctBox[],
      );
      const fileName = `${(distribution.revision.fileName ?? distribution.revision.documentControl.docNumber).replace(/\.[^.]+$/, "")}.pdf`;
      const sp = await uploadFileToDistribution({
        fileBuffer: stampedBuffer,
        fileName,
        mimeType: "application/pdf",
        darNo: distribution.darMaster.darNo ?? distribution.darMasterId,
        suffix: "base-revised",
      });
      basePdfSpItemId = sp.spItemId;
      basePdfSpWebUrl = sp.spWebUrl;
    }

    const updated = await db.$transaction(async (tx) => {
      await this.repo.update(id, {
        ...(input.stampImageKey !== undefined ? { stampImageKey: input.stampImageKey } : {}),
        ...(input.stampImageBox !== undefined ? { stampImageBox: input.stampImageBox } : {}),
        ...(input.dateFieldBox !== undefined ? { dateFieldBox: input.dateFieldBox } : {}),
        ...(input.copyToFieldBox !== undefined ? { copyToFieldBox: input.copyToFieldBox } : {}),
        ...(basePdfSpItemId ? { basePdfSpItemId, basePdfSpWebUrl } : {}),
      }, tx);

      if (targetDepartmentIds) {
        const departments = await this.deptCodeRepo.findAll();
        const selected = departments.filter((department) => targetDepartmentIds.includes(department.id));
        await this.repo.deletePendingTargetsNotIn(id, targetDepartmentIds, tx);
        await this.repo.createTargets(id, selected.map((department) => ({
          departmentId: department.id,
          departmentCode: department.code,
          departmentName: department.departmentName,
        })), tx);
      }
      return this.repo.findById(id, tx);
    });
    return updated;
  }

  async remove(id: string, actor: { role: string }) {
    if (!isPrivilegedQmsRole(actor.role)) throw new ForbiddenError();
    const distribution = await this.getById(id);
    await this.repo.delete(distribution.id);
    return { id: distribution.id };
  }

  async getPublishedPreviewPdfBuffer(id: string): Promise<Buffer> {
    const distribution = await this.getById(id);
    if (!distribution.basePdfSpItemId) throw new ValidationError("ไม่พบไฟล์ PDF ที่เผยแพร่");
    const info = await getFileInfo(distribution.basePdfSpItemId);
    if (!info.downloadUrl) throw new ValidationError("ไม่พบไฟล์ PDF ใน SharePoint");
    const res = await fetch(info.downloadUrl);
    if (!res.ok) throw new ValidationError("โหลดไฟล์ PDF ไม่สำเร็จ");
    return Buffer.from(await res.arrayBuffer());
  }

  async listCandidateRevisions(darId: string) {
    const dar = await this.darRepo.findDetailById(darId);
    if (!dar) throw new NotFoundError("DAR");
    const categoryName = DAR_DOC_TYPE_TO_CATEGORY[dar.docType?.trim().toUpperCase()] ?? undefined;
    return this.docControlRepo.findCandidateRevisionsByDarId(darId, {
      authDepartmentId: dar.authDepartmentId,
      departmentName: dar.requesterDepartmentName,
      categoryName: categoryName,
    });
  }

  async getDarDistributionSetup(darId: string) {
    const dar = await this.darRepo.findDistributionSetup(darId);
    if (!dar) throw new NotFoundError("DAR");
    const docDept = await this.docControlRepo.findDocControlDepartment(dar.authDepartmentId, dar.requesterDepartmentName);
    return { requesterDepartmentName: dar.requesterDepartmentName, authDepartmentId: dar.authDepartmentId, departmentId: dar.departmentId, docControlDepartmentId: docDept?.id ?? null, docType: dar.docType, supportedTypes: ["P", "SOP", "M", "Drawing", "SIP", "IPQC"] };
  }

  async prepareDocument(
    darId: string,
    actor: { userId: string; authUserId?: string | null },
    input: { action: "link" | "create" | "standalone"; revisionId?: string; docNumber?: string; docName?: string; revision?: string; categoryName?: string },
  ) {
    const dar = await this.darRepo.findDetailById(darId);
    if (!dar) throw new NotFoundError("DAR");
    if (dar.status !== "COMPLETED") throw new ValidationError("ต้องเป็น DAR ที่เสร็จสิ้นแล้วเท่านั้น");

    if (input.action === "link") {
      if (!input.revisionId) throw new ValidationError("กรุณาเลือก Revision ที่ต้องการเชื่อมโยง");
      const revision = await this.docControlRepo.findRevisionWithDocument(input.revisionId);
      if (!revision) throw new NotFoundError("Revision");
      if (!revision.spItemId) throw new ValidationError("Revision นี้ไม่มีไฟล์สำหรับ preview");
      const departmentMatches = revision.documentControl.authDepartmentId === dar.authDepartmentId || revision.documentControl.departmentName === dar.requesterDepartmentName;
      if (!departmentMatches) throw new ValidationError("เอกสารต้องอยู่ในแผนกเดียวกับ Requester");
      await this.docControlRepo.linkRevisionToDar(revision.id, darId);
      return { revisionId: revision.id };
    }

    if (input.action === "standalone") {
      if (!dar.spItemId) throw new ValidationError("DAR นี้ไม่มีไฟล์ต้นฉบับสำหรับ Preview");
      const item = dar.items[0];
      const sourceItemId = dar.spItemId;
      const generatedNumber = item?.docNumber?.trim() || `DAR-${dar.darNo ?? darId}`;
      const existing = await this.docControlRepo.findByDocNumber(generatedNumber);
      const existingRevision = existing?.revisions.find((revision) => revision.darMasterId === darId && revision.spItemId);
      if (existingRevision) return { revisionId: existingRevision.id };
      const docDept = await this.docControlRepo.findDocControlDepartment(dar.authDepartmentId, dar.requesterDepartmentName);
      if (!docDept) throw new ValidationError("ไม่พบแผนกของ Requester ใน Document Control");
      const category = await this.docControlRepo.findOrCreateCategory(docDept.id, "UNLINKED", docDept.name, docDept.authDeptCode ?? dar.authDepartmentId);
      const creator = actor.authUserId ? await getUserSnapshot(actor.authUserId) : null;
      const created = await db.$transaction((tx) => this.docControlRepo.createDocumentFromDar({
        docNumber: existing ? `DAR-${darId}` : generatedNumber, docName: item?.docName?.trim() || `DAR ${dar.darNo ?? darId}`, revision: item?.revision?.trim() || "0", description: `Preview จาก DAR ${dar.darNo ?? darId}`,
        departmentId: docDept.id, authDepartmentId: docDept.authDeptCode ?? dar.authDepartmentId, departmentName: docDept.name, categoryId: category.id,
        createdById: actor.userId, createdByAuthUserId: actor.authUserId ?? null, createdByName: creator?.name ?? null, spDriveId: dar.spDriveId, spItemId: sourceItemId, spWebUrl: dar.spWebUrl, fileName: `DAR-${dar.darNo ?? darId}`, mimeType: "application/octet-stream",
      }, darId, tx));
      return { revisionId: created.id };
    }

    if (!input.docNumber?.trim() || !input.docName?.trim() || !input.revision?.trim() || !input.categoryName?.trim()) {
      throw new ValidationError("กรุณาระบุประเภทเอกสาร หมายเลขเอกสาร ชื่อเอกสาร และ Revision ให้ครบ");
    }
    if (!dar.spItemId) throw new ValidationError("DAR นี้ไม่มีไฟล์ต้นฉบับสำหรับสร้าง Revision");

    const sourceItemId = dar.spItemId as string;
    const docDept = await this.docControlRepo.findDocControlDepartment(dar.authDepartmentId, dar.requesterDepartmentName);
    if (!docDept) throw new ValidationError("ไม่พบแผนกของ Requester ใน Document Control");
    const category = await this.docControlRepo.findOrCreateCategory(docDept.id, input.categoryName.trim(), docDept.name, docDept.authDeptCode ?? dar.authDepartmentId);
    if (!category) throw new ValidationError(`ไม่พบหมวดเอกสาร ${input.categoryName} ของแผนก Requester`);
    const duplicate = await this.docControlRepo.findByDocNumber(input.docNumber.trim());
    if (duplicate) throw new ValidationError("หมายเลขเอกสารนี้มีอยู่แล้ว");
    const creator = actor.authUserId ? await getUserSnapshot(actor.authUserId) : null;

    const created = await db.$transaction((tx) => this.docControlRepo.createDocumentFromDar({
      docNumber: input.docNumber!.trim(), docName: input.docName!.trim(), revision: input.revision!.trim(), description: `สร้างจาก DAR ${darId}`,
      departmentId: docDept.id, authDepartmentId: docDept.authDeptCode ?? dar.authDepartmentId, departmentName: docDept.name, categoryId: category.id,
      createdById: actor.userId, createdByAuthUserId: actor.authUserId ?? null, createdByName: creator?.name ?? null,
      spDriveId: dar.spDriveId, spItemId: sourceItemId, spWebUrl: dar.spWebUrl, fileName: `DAR-${dar.darNo ?? darId}`, mimeType: "application/octet-stream",
    }, darId, tx));
    return { revisionId: created.id };
  }

  async getPreviewPdfBuffer(darId: string, revisionId: string, actorRole: string): Promise<Buffer> {
    if (!isPrivilegedQmsRole(actorRole)) throw new ForbiddenError();
    const revision = await this.docControlRepo.findRevisionForDistribution(revisionId);
    if (!revision || revision.darMasterId !== darId) throw new NotFoundError("รุ่นเอกสาร");
    if (!revision.spItemId) throw new ValidationError("รุ่นเอกสารนี้ไม่มีไฟล์แนบ");
    return this.fetchSourcePdfBuffer(revision.spItemId, revision.mimeType);
  }

  // Every published distribution is visible to everyone; each row also carries
  // "myTarget" so the UI can show a Download button only for the caller's own department.
  async listAllForUser(authDepartmentId?: string | null) {
    const [distributions, myDeptCode] = await Promise.all([
      this.repo.findAllRecent(),
      authDepartmentId ? this.deptCodeRepo.findByAuthDeptId(authDepartmentId) : Promise.resolve(null),
    ]);
    return distributions.map((d) => ({
      ...d,
      myTarget: myDeptCode ? d.targets.find((t) => t.departmentId === myDeptCode.id) ?? null : null,
    }));
  }

  // QMS can widen distribution to departments the requester didn't originally select.
  async addTargetDepartment(distributionId: string, actor: { role: string }, departmentId: string) {
    if (!isPrivilegedQmsRole(actor.role)) throw new ForbiddenError();

    const distribution = await this.repo.findById(distributionId);
    if (!distribution) throw new NotFoundError("การแจกจ่ายเอกสาร");

    const dept = await this.deptCodeRepo.findById(departmentId);
    if (!dept) throw new ValidationError("ไม่พบแผนกที่เลือก");
    if (distribution.targets.some((t) => t.departmentId === departmentId)) {
      throw new ValidationError("แผนกนี้อยู่ในรายการแจกจ่ายอยู่แล้ว");
    }

    const target = await this.repo.addTarget(distributionId, {
      departmentId: dept.id,
      departmentCode: dept.code,
      departmentName: dept.departmentName,
    });

    this.notifyTargets([dept], { darNo: distribution.darMaster.darNo }, distribution.revision.documentControl.docNumber, distribution.revision.documentControl.docName).catch((err) =>
      logger.error("[DocumentDistributionService.addTargetDepartment] notify failed (continuing)", err),
    );

    return target;
  }

  // One download per department per revision — a target can only be claimed once.
  // Date/Copy-to are baked in at download time using that department's own download date and code.
  async downloadForDepartment(
    distributionId: string,
    actor: { userId: string; userName: string | null; authDepartmentId?: string | null },
  ): Promise<{ buffer: Buffer; fileName: string }> {
    if (!actor.authDepartmentId) throw new ForbiddenError();
    const deptCode = await this.deptCodeRepo.findByAuthDeptId(actor.authDepartmentId);
    if (!deptCode) throw new ForbiddenError();

    const distribution = await this.repo.findById(distributionId);
    if (!distribution) throw new NotFoundError("การแจกจ่ายเอกสาร");

    const target = distribution.targets.find((t) => t.departmentId === deptCode.id);
    if (!target) throw new ForbiddenError();
    if (target.downloadedAt) throw new ValidationError("แผนกนี้ดาวน์โหลดเอกสารฉบับนี้ไปแล้ว");
    if (!distribution.basePdfSpItemId) throw new ValidationError("ไม่พบไฟล์เอกสารที่ผ่านการ stamp แล้ว");

    const info = await getFileInfo(distribution.basePdfSpItemId);
    if (!info.downloadUrl) throw new ValidationError("ไม่พบไฟล์ต้นฉบับใน SharePoint");
    const res = await fetch(info.downloadUrl);
    if (!res.ok) throw new ValidationError("ดาวน์โหลดไฟล์ต้นฉบับไม่สำเร็จ");
    const baseBuffer = Buffer.from(await res.arrayBuffer());

    const today = new Date().toISOString().slice(0, 10);
    const finalBuffer = await bakeDynamicFields(baseBuffer, distribution.stampImageKey, distribution.stampImageBox as PctBox | PctBox[], [
      { text: `Date: ${today}`, box: distribution.dateFieldBox as PctBox | PctBox[] },
      { text: `Copy to: ${deptCode.code}`, box: distribution.copyToFieldBox as PctBox | PctBox[] },
    ]);

    const fileName = `${distribution.darMaster.darNo ?? distribution.darMasterId}_${deptCode.code}.pdf`;
    const sp = await uploadFileToDistribution({
      fileBuffer: finalBuffer,
      fileName,
      mimeType: "application/pdf",
      darNo: distribution.darMaster.darNo ?? distribution.darMasterId,
      suffix: deptCode.code,
    });

    const claimed = await this.repo.claimTargetDownload(target.id, {
      downloadedById: actor.userId,
      downloadedByName: actor.userName,
      finalPdfSpItemId: sp.spItemId,
      finalPdfSpWebUrl: sp.spWebUrl,
    });
    if (!claimed) throw new ValidationError("แผนกนี้ดาวน์โหลดเอกสารฉบับนี้ไปแล้ว");

    return { buffer: finalBuffer, fileName };
  }
}
