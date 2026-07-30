import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { DocumentDistributionService } from "@/services/documentDistributionService";
import { z } from "zod";

const service = new DocumentDistributionService();
const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = paramsSchema.parse(await params);
    const buffer = await service.getPublishedPreviewPdfBuffer(id);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=60",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "frame-ancestors 'self'",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
