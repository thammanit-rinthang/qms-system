import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { DocumentDistributionService } from "@/services/documentDistributionService";
import { z } from "zod";

const paramSchema = z.object({ id: z.string().uuid() });

type Params = { params: Promise<{ id: string }> };

const service = new DocumentDistributionService();

// Revisions linked to this DAR that have no distribution yet — publishable candidates.
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const { id: darId } = paramSchema.parse(await params);
    const revisions = await service.listCandidateRevisions(darId);
    const dar = await service.getDarDistributionSetup(darId);
    return NextResponse.json({ data: revisions, meta: dar, error: null });
  } catch (err) {
    return handleApiError(err);
  }
}
