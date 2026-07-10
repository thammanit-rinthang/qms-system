import { type NextRequest, NextResponse } from "next/server";
import { CarReminderService } from "@/services/carReminderService";
import { logger } from "@/lib/logger";

// Vercel cron or external scheduler hits GET /api/cron/car-reminder
// with Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await CarReminderService.processAllDue();
    logger.info("[cron/car-reminder] completed", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error("[cron/car-reminder] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
