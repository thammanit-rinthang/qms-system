import { requireRoleEdge } from "@/lib/auth";
import { ApprovalConfigService } from "@/services/approvalConfigService";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { APPROVAL_CONFIG_MODULES, type ApprovalConfigModuleKey } from "@/lib/approval-config";
import { type NextRequest } from "next/server";
import { z } from "zod";

const configService = new ApprovalConfigService();

const approvalConfigSchema = z.object({
  modules: z.array(z.object({
    moduleKey: z.enum(APPROVAL_CONFIG_MODULES.map((module) => module.key) as [string, ...string[]]),
    mrAuthUserId: z.string().nullable().optional(),
    qmsAuthUserId: z.string().nullable().optional(),
    mrEmail: z.string().nullable().optional(),
    qmsEmail: z.string().nullable().optional(),
  })),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireRoleEdge(req, "QMS", "IT");
    const result = await configService.getConfig(session.user.accessToken);
    return sendSuccess(result, "Approval configurations retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRoleEdge(req, "QMS", "IT");
    const body = await req.json();
    const validated = approvalConfigSchema.parse(body);

    await configService.updateConfig(
      validated.modules.map((module) => ({
        ...module,
        moduleKey: module.moduleKey as ApprovalConfigModuleKey,
      })),
    );

    return sendSuccess(null, "Approval configurations updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
