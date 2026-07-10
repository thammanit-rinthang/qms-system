import { requireRole } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { getDocNoFormat, saveDocNoFormat, validateFormat } from "@/lib/docNoConfig";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";
import { type NextRequest } from "next/server";

const MODULES = ["DAR", "CAR", "AUDIT_APPT", "AUDIT_PLAN"] as const;

const schema = z.object({
  module: z.enum(["DAR", "CAR", "AUDIT_APPT", "AUDIT_PLAN"]),
  format: z.string().min(1).max(100),
});

export async function GET() {
  try {
    await requireRole("QMS", "IT", "MR");
    const configs = await Promise.all(
      MODULES.map(async (m) => ({ module: m, format: await getDocNoFormat(m) }))
    );
    return sendSuccess(configs);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("QMS", "IT", "MR");
    const { module, format } = schema.parse(await req.json());
    const err = validateFormat(format);
    if (err) throw new ValidationError(err);
    await saveDocNoFormat(module, format);
    return sendSuccess({ module, format }, "Saved");
  } catch (err) {
    return handleApiError(err);
  }
}
