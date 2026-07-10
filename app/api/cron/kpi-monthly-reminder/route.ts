import { type NextRequest, NextResponse } from "next/server";
import { KpiMonthlyReminderService } from "@/services/kpiMonthlyReminderService";
import { logger } from "@/lib/logger";

// Vercel cron or external scheduler hits GET /api/cron/kpi-monthly-reminder
// with Authorization: Bearer <CRON_SECRET>
// Schedule: daily at 08:00 — the service itself only acts on the 25th and last day of month.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const day = now.getDate();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const force = req.nextUrl.searchParams.get("force") === "1";
  const shouldRun = force || day === 25 || day === lastDay;

  if (!shouldRun) {
    return NextResponse.json({ ok: true, skipped: true, reason: "not a reminder day" });
  }

  try {
    const result = await KpiMonthlyReminderService.processReminders(now);
    logger.info("[cron/kpi-monthly-reminder] completed", { day, ...result });
    return NextResponse.json({ ok: true, day, ...result });
  } catch (err) {
    logger.error("[cron/kpi-monthly-reminder] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
