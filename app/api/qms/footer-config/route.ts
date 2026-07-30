import { NextResponse, type NextRequest } from "next/server";
import { requireRoleEdge, requireAuthEdge } from "@/lib/auth";
import { QmsConfigService } from "@/services/qmsConfigService";
import { handleApiError } from "@/lib/apiErrorHandler";
import { z } from "zod";

export const dynamic = "force-dynamic";

const qmsConfigService = new QmsConfigService();

const MODULES = ["DAR", "CAR", "KPI_ANNUAL", "KPI_MONTHLY", "DOC_CONTROL", "AUDIT_APPT", "AUDIT_PLAN", "AUDITOR"] as const;

const updateSchema = z.object({
  configs: z.array(
    z.object({
      moduleKey: z.enum(MODULES),
      prefix: z.string(),
      label: z.string(),
    })
  ),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuthEdge(req);
    const configs = await qmsConfigService.getFooterConfigs([...MODULES]);
    return NextResponse.json({ data: configs, error: null });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRoleEdge(req, "QMS", "IT");
    const body = await req.json();
    const parsed = updateSchema.parse(body);
    await qmsConfigService.updateFooterConfigs(parsed.configs);
    return NextResponse.json({ data: { success: true }, error: null });
  } catch (err) {
    return handleApiError(err);
  }
}
