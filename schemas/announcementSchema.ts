import { z } from "zod";

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, "กรุณาระบุหัวข้อ").max(255),
  content: z.string().min(1, "กรุณาระบุเนื้อหา").max(5000),
  sourceSystem: z.string().max(100).optional().default("QMS"),
  displayType: z.enum(["LIST", "SCROLLING", "BANNER"]).default("LIST"),
  pushToCompanyCenter: z.boolean().default(false),
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  spItemId: z.string().optional().nullable(),
  spWebUrl: z.string().url().optional().nullable(),
  spDownloadUrl: z.string().url().optional().nullable(),
  fileName: z.string().max(255).optional().nullable(),
  mimeType: z.string().max(100).optional().nullable(),
  bgColor: z.string().max(20).optional().nullable(),
  bgImageUrl: z.string().url().optional().nullable(),
  bgImageSpId: z.string().optional().nullable(),
  textColor: z.string().max(20).optional().nullable(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();
