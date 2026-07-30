import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { DocumentDistributionService } from "@/services/documentDistributionService";

const paramsSchema = z.object({ id: z.string().uuid() });
const boxSchema = z.union([
  z.object({ xPct: z.number().min(0).max(1), yPct: z.number().min(0).max(1), wPct: z.number().min(0).max(1).optional(), fontSize: z.number().positive().optional() }),
  z.array(z.object({ xPct: z.number().min(0).max(1), yPct: z.number().min(0).max(1), wPct: z.number().min(0).max(1).optional(), fontSize: z.number().positive().optional() })).min(1),
]);
const updateSchema = z.object({
  stampImageKey: z.string().optional(),
  stampImageBox: boxSchema.optional(),
  dateFieldBox: boxSchema.optional(),
  copyToFieldBox: boxSchema.optional(),
  targetDepartmentIds: z.array(z.string().min(1)).min(1).optional(),
});
type Params = { params: Promise<{ id: string }> };
const service = new DocumentDistributionService();

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = paramsSchema.parse(await params);
    await requireAuth();
    return NextResponse.json({ data: await service.getById(id), error: null });
  } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = paramsSchema.parse(await params);
    const body = updateSchema.parse(await req.json());
    return NextResponse.json({ data: await service.update(id, { role: session.user.role }, body), error: null });
  } catch (err) { return handleApiError(err); }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = paramsSchema.parse(await params);
    return NextResponse.json({ data: await service.remove(id, { role: session.user.role }), error: null });
  } catch (err) { return handleApiError(err); }
}
