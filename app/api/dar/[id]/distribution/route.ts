import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { DocumentDistributionService } from "@/services/documentDistributionService";
import { z } from "zod";

const paramSchema = z.object({ id: z.string().uuid() });

const pctBoxSchema = z.object({
  xPct: z.number().min(0).max(1),
  yPct: z.number().min(0).max(1),
  wPct: z.number().min(0).max(1).optional(),
  fontSize: z.number().positive().optional(),
});
const pageBoxesSchema = z.union([pctBoxSchema, z.array(pctBoxSchema).min(1)]);

const publishSchema = z.object({
  revisionId: z.string().uuid(),
  stampImageKey: z.string(),
  stampImageBox: pageBoxesSchema,
  dateFieldBox: pageBoxesSchema,
  copyToFieldBox: pageBoxesSchema,
  targetDepartmentIds: z.array(z.string()).min(1),
  linkToDocumentControl: z.boolean().default(true),
  createRevisionOnPublish: z.boolean().default(false),
});

type Params = { params: Promise<{ id: string }> };

const service = new DocumentDistributionService();

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const { id: darId } = paramSchema.parse(await params);
    const distributions = await service.listByDar(darId);
    return NextResponse.json({ data: distributions, error: null });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: darId } = paramSchema.parse(await params);
    const body = publishSchema.parse(await req.json());

    const distribution = await service.publish(
      darId,
      { userId: session.user.id, role: session.user.role, authUserId: session.user.authUserId ?? null },
      body,
    );

    return NextResponse.json({ data: distribution, error: null }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
