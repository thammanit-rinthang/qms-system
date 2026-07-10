import { z } from "zod";

export const darQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const createDarSchema = z.object({
  objective: z.enum(["PREPARE_NEW", "REQUEST_COPY_CONTROLLED", "REQUEST_COPY_UNCONTROLLED", "REVISE", "CANCEL"]),
  docType: z.enum(["MANUAL", "FORMAT", "DRAWING", "PROCEDURE", "SOP", "SIP", "IPQC", "OTHER"]),
  docTypeOther: z.string().max(100).optional(),
  reason: z.string().min(1, "กรุณาระบุเหตุผล").max(2000),
  items: z.array(
    z.object({
      docNumber: z.string().min(1, "กรุณาระบุเลขที่เอกสาร").max(100),
      docName: z.string().min(1, "กรุณาระบุชื่อเอกสาร").max(255),
      revision: z.string().min(1, "กรุณาระบุ Revision").max(50),
    })
  ).min(1, "ต้องมีเอกสารอย่างน้อย 1 รายการ"),
  distributionDepartmentIds: z.array(z.string().min(1)).default([]),
  action: z.enum(["DRAFT", "SUBMIT"]).default("DRAFT"),
  tempAttachments: z.array(
    z.object({
      spItemId: z.string().min(1),
      spWebUrl: z.string().url(),
      spDownloadUrl: z.string().url(),
      folderPath: z.string().min(1),
      fileName: z.string().min(1).max(255),
      fileSize: z.number().int().min(1),
      mimeType: z.string().min(1),
    })
  ).default([]),
});

export const updateDarSchema = createDarSchema.partial().omit({ action: true, tempAttachments: true });
