import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { sendSuccess } from "@/lib/apiResponse";
import { UserService } from "@/services/userService";
import { blockJwt } from "@/lib/jwt-blocklist";

const bodySchema = z.object({
  jti: z.string().min(1),
  ttlSec: z.number().int().positive().max(86400),
});

type Params = { params: Promise<{ id: string }> };

const userService = new UserService();

export async function POST(
  req: NextRequest,
  { params }: Params
) {
  try {
    await requireRole("IT");
    const { id } = await params;

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid body");
    }

    await userService.verifyUserExists(id);
    await blockJwt(parsed.data.jti, parsed.data.ttlSec);

    return sendSuccess({ blocked: true }, "Session blocked successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
