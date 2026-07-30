import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { DocumentDistributionService } from "@/services/documentDistributionService";
import { z } from "zod";

const paramSchema = z.object({ id: z.string().uuid(), distributionId: z.string().uuid() });
const bodySchema = z.object({ departmentId: z.string().min(1) });

type Params = { params: Promise<{ id: string; distributionId: string }> };

const service = new DocumentDistributionService();

// QMS can widen distribution to a department that wasn't originally selected.
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { distributionId } = paramSchema.parse(await params);
    const { departmentId } = bodySchema.parse(await req.json());

    const target = await service.addTargetDepartment(distributionId, { role: session.user.role }, departmentId);

    return NextResponse.json({ data: target, error: null }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
