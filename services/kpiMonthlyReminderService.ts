import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendKpiMonthlyReminderEmail } from "@/services/email";

// Fire on the 25th and on the last day of each month.
// The cron caller is responsible for calling this on those dates.
// This service finds KPIs whose monthly report for the current month/year
// is still in DRAFT or does not exist yet, then emails the dept emailGroup.

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const KpiMonthlyReminderService = {
  async processReminders(now: Date): Promise<{ reminded: number; skipped: number }> {
    const year = now.getFullYear();
    const month = MONTH_NAMES[now.getMonth()];
    const isLastDay = new Date(year, now.getMonth() + 1, 0).getDate() === now.getDate();

    // All active KPI depts that have an email group
    const depts = await db.kpiDept.findMany({
      where: { isActive: true, emailGroup: { not: null } },
      select: { name: true, emailGroup: true },
    });

    let reminded = 0;
    let skipped = 0;

    for (const dept of depts) {
      // Find the active KPI for this dept/year
      const kpi = await db.kPI.findFirst({
        where: { department: dept.name, yearly: year },
        select: { id: true },
      });
      if (!kpi) { skipped++; continue; }

      // Check if monthly report already approved/submitted
      const report = await db.kPIMonthlyReport.findUnique({
        where: { kpiId_month_year: { kpiId: kpi.id, month, year } },
        select: { status: true },
      });

      // Skip if already submitted (in review/approval flow) or approved — reminder not needed
      if (report?.status === "APPROVED" || report?.status === "PENDING_REVIEW" || report?.status === "PENDING_APPROVAL") {
        skipped++;
        continue;
      }

      const emails = (dept.emailGroup ?? "")
        .split(/[,;]/)
        .map((e) => e.trim())
        .filter(Boolean);
      if (!emails.length) { skipped++; continue; }

      try {
        await sendKpiMonthlyReminderEmail({
          to: emails.map((e) => ({ name: dept.name, email: e })),
          departmentName: dept.name,
          month,
          year,
          isLastDay,
          // ponytail: no user token available in cron context — uses M2M auth inside sendMail
          senderAccessToken: null,
        });
        reminded++;
        logger.info("[KpiMonthlyReminderService] reminded", { dept: dept.name, month, year });
      } catch (err) {
        logger.error("[KpiMonthlyReminderService] email failed", { dept: dept.name, error: String(err) });
        skipped++;
      }
    }

    return { reminded, skipped };
  },
};
