import { BaseRepository } from "./baseRepository";
import type { Prisma, QmsProcessing } from "@/generated/prisma/client";

type UpsertQmsProcessingInput = {
  darMasterId: string;
  qmsUserId: string;
  qmsAuthUserId?: string | null;
  qmsUserName?: string | null;
  qmsUserEmployeeId?: string | null;
  chkHasAttachment: boolean;
  chkPrintAndValidate: boolean;
  chkRenumber: boolean;
  chkImpactInvestigated: boolean;
  chkSubmitVerification: boolean;
  chkGetBackProcess: boolean;
  chkCopyDistribute: boolean;
  comments?: string | null;
  processDate: Date;
};

export class QmsProcessingRepository extends BaseRepository<QmsProcessing> {
  constructor() {
    super("qmsProcessing");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).qmsProcessing;
  }

  async upsertByDarMasterId(input: UpsertQmsProcessingInput, tx: Prisma.TransactionClient) {
    return this.delegate(tx).upsert({
      where: { darMasterId: input.darMasterId },
      update: {
        qmsUserId: input.qmsUserId,
        qmsAuthUserId: input.qmsAuthUserId ?? null,
        qmsUserName: input.qmsUserName ?? null,
        qmsUserEmployeeId: input.qmsUserEmployeeId ?? null,
        chkHasAttachment: input.chkHasAttachment,
        chkPrintAndValidate: input.chkPrintAndValidate,
        chkRenumber: input.chkRenumber,
        chkImpactInvestigated: input.chkImpactInvestigated,
        chkSubmitVerification: input.chkSubmitVerification,
        chkGetBackProcess: input.chkGetBackProcess,
        chkCopyDistribute: input.chkCopyDistribute,
        comments: input.comments ?? null,
        processDate: input.processDate,
      },
      create: {
        darMasterId: input.darMasterId,
        qmsUserId: input.qmsUserId,
        qmsAuthUserId: input.qmsAuthUserId ?? null,
        qmsUserName: input.qmsUserName ?? null,
        qmsUserEmployeeId: input.qmsUserEmployeeId ?? null,
        chkHasAttachment: input.chkHasAttachment,
        chkPrintAndValidate: input.chkPrintAndValidate,
        chkRenumber: input.chkRenumber,
        chkImpactInvestigated: input.chkImpactInvestigated,
        chkSubmitVerification: input.chkSubmitVerification,
        chkGetBackProcess: input.chkGetBackProcess,
        chkCopyDistribute: input.chkCopyDistribute,
        comments: input.comments ?? null,
        processDate: input.processDate,
      },
    });
  }
}
