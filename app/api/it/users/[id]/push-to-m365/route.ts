import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { UserService } from "@/services/userService";

type Params = { params: Promise<{ id: string }> };

const userService = new UserService();

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("IT");
    const { id } = await params;

    await userService.pushUserToM365(id);

    return NextResponse.json({ data: { pushed: true }, error: null });
  } catch (err) {
    return handleApiError(err);
  }
}
