
import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { DepartmentService } from "@/services/departmentService";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";

const deptService = new DepartmentService();

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  emailGroup: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
});
const paramSchema = z.object({ id: z.string().min(1) });

type Params = { params: Promise<{ id: string }> };

export async function PATCH(
  req: NextRequest,
  { params }: Params,
) {
  try {
    const session = await requireRole("IT");
    const { id } = paramSchema.parse(await params);
    const body = await req.json();
    const validated = updateSchema.parse(body);
    const dept = await deptService.updateDepartment(id, validated, session.user.accessToken);
    return sendSuccess(dept, "Department updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: Params,
) {
  try {
    const session = await requireRole("IT");
    const { id } = paramSchema.parse(await params);
    await deptService.deleteDepartment(id, session.user.accessToken);
    return sendSuccess({ id }, "Department deleted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
