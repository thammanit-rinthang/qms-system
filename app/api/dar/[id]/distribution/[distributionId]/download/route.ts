import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { DocumentDistributionService } from "@/services/documentDistributionService";
import { z } from "zod";

const paramSchema = z.object({ id: z.string().uuid(), distributionId: z.string().uuid() });

type Params = { params: Promise<{ id: string; distributionId: string }> };

const service = new DocumentDistributionService();

export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { distributionId } = paramSchema.parse(await params);

    const { buffer, fileName } = await service.downloadForDepartment(distributionId, {
      userId: session.user.id,
      userName: session.user.name ?? null,
      authDepartmentId: session.user.authDepartmentId ?? null,
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
