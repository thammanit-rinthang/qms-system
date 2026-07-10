import { requireRole } from "@/lib/auth";
import { DepartmentCodeRepository } from "@/repositories/departmentCodeRepository";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { z } from "zod";
import { type NextRequest } from "next/server";

const repo = new DepartmentCodeRepository();

const schema = z.object({
  authDeptId: z.string().min(1),
  departmentName: z.string().min(1).max(200),
  code: z.string().min(1).max(20).toUpperCase(),
});

export async function GET() {
  try {
    await requireRole("QMS", "IT", "MR");
    const data = await repo.findAll();
    return sendSuccess(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("QMS", "IT", "MR");
    const body = schema.parse(await req.json());
    const data = await repo.upsert(body);
    return sendSuccess(data, "Department code saved", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
