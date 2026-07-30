import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { DocumentDistributionService } from "@/services/documentDistributionService";
import { z } from "zod";

const paramSchema = z.object({ id: z.string().uuid(), revisionId: z.string().uuid() });

type Params = { params: Promise<{ id: string; revisionId: string }> };

const service = new DocumentDistributionService();

// Streams the source file as a PDF (converting via Graph rendition if needed) so the
// stamp-position editor previews exactly what will be stamped and published.
export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: darId, revisionId } = paramSchema.parse(await params);
    const buffer = await service.getPreviewPdfBuffer(darId, revisionId, session.user.role);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
