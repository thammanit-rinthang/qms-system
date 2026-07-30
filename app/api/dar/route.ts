import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import { darQuerySchema, createDarSchema } from "@/schemas/darSchema";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ValidationError } from "@/errors/customErrors";
import { type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { isPrivilegedRole } from "@/lib/permissions";

const darService = new DarService();

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = req.nextUrl;
    
    const isPrivileged = isPrivilegedRole(session.user.role);
    if (isPrivileged && searchParams.get("all") === "true") {
      const dars = await darService.getAllDars();
      return sendSuccess(dars, "All DARs retrieved successfully");
    }

    const parsed = darQuerySchema.parse({
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const { page, limit } = parsed;
    const { dars, total } = await darService.getDarsByRequesterId(session.user.id, page, limit);

    return sendSuccess(dars, "DARs retrieved successfully", 200, { page, limit, total });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();

    if (!session.user.departmentId && !session.user.authDepartmentId) {
      throw new ValidationError("บัญชีของคุณยังไม่ได้ผูกกับแผนก กรุณาติดต่อ IT");
    }

    const body = await req.json();
    const parsed = createDarSchema.parse(body);

    const { action, ...input } = parsed;

    if (input.docType === "OTHER" && !input.docTypeOther?.trim()) {
      throw new ValidationError("กรุณาระบุประเภทเอกสาร (อื่นๆ)");
    }

    let dar = await darService.createDar(
      session.user.id,
      session.user.departmentId,
      {
        ...input,
        tempAttachments: parsed.tempAttachments,
      },
      session.user.authDepartmentId,
    );

    if (action === "SUBMIT") {
      dar = await darService.submitDar(dar.id, { userId: session.user.id, authUserId: session.user.authUserId, accessToken: session.user.accessToken });
    }

    revalidateTag("dar-list");

    return sendSuccess(
      dar,
      action === "SUBMIT" ? "DAR submitted successfully" : "DAR draft created successfully",
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}
