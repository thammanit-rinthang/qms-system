import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { DocumentDistributionService } from "@/services/documentDistributionService";
import { z } from "zod";

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("link"), revisionId: z.string().uuid() }),
  z.object({ action: z.literal("create"), categoryName: z.string().min(1), docNumber: z.string().min(1).max(50), docName: z.string().min(1).max(255), revision: z.string().min(1).max(20) }),
  z.object({ action: z.literal("standalone") }),
]);
const service = new DocumentDistributionService();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("QMS", "IT", "MR");
    const { id } = paramsSchema.parse(await params);
    const input = bodySchema.parse(await req.json());
    const data = await service.prepareDocument(id, { userId: session.user.id, authUserId: session.user.authUserId ?? null }, input);
    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
