import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { DocumentDistributionService } from "@/services/documentDistributionService";

const service = new DocumentDistributionService();

// Every published distribution, visible to any authenticated user. Each row carries
// "myTarget" (null unless the caller's own department is a target) so the client
// can show a Download button only where it's actually allowed.
export async function GET() {
  try {
    const session = await requireAuth();
    const distributions = await service.listAllForUser(session.user.authDepartmentId ?? null);
    return NextResponse.json({ data: distributions, error: null });
  } catch (err) {
    return handleApiError(err);
  }
}
