import { requireRole } from "@/lib/auth";
import { DepartmentCodeRepository } from "@/repositories/departmentCodeRepository";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { NotFoundError } from "@/lib/errors";
import { z } from "zod";
import { type NextRequest } from "next/server";

const repo = new DepartmentCodeRepository();

const schema = z.object({
  departmentName: z.string().min(1).max(200),
  code: z.string().min(1).max(20).toUpperCase(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireRole("QMS", "IT", "MR");
    const { id } = await params;
    const existing = await repo.findById(id);
    if (!existing) throw new NotFoundError("DepartmentCode");
    const body = schema.parse(await req.json());
    const data = await repo.upsert({ authDeptId: existing.authDeptId, ...body });
    return sendSuccess(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("QMS", "IT", "MR");
    const { id } = await params;
    const existing = await repo.findById(id);
    if (!existing) throw new NotFoundError("DepartmentCode");
    await repo.delete(id);
    return sendSuccess(null, "Deleted");
  } catch (err) {
    return handleApiError(err);
  }
}
