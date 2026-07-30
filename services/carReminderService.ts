import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { CarRepository } from "@/repositories/carRepository";
import { sendCarReminderEmail, sendCarOverdueEmail } from "@/services/carEmailService";

const PREFIX = "car:reminder:";
const DAY_MS = 24 * 60 * 60 * 1000;
const TTL_SEC = 30 * 24 * 60 * 60;

type ReminderEntry = {
  fireAt3d: number;   // 3-day reminder timestamp
  fireAt7d: number;   // 7-day overdue timestamp
  fired3d?: boolean;
  deptEmailGroup?: string | null;
  issuerEmail?: string | null;
  // legacy compat
  fireAt?: number;
};

export const CarReminderService = {
  async schedule(carId: string, opts?: { deptEmailGroup?: string | null; issuerEmail?: string | null }): Promise<void> {
    const now = Date.now();
    const entry: ReminderEntry = {
      fireAt3d: now + 3 * DAY_MS,
      fireAt7d: now + 7 * DAY_MS,
      deptEmailGroup: opts?.deptEmailGroup ?? null,
      issuerEmail: opts?.issuerEmail ?? null,
    };
    await redis.set(`${PREFIX}${carId}`, JSON.stringify(entry), "EX", TTL_SEC);
  },

  async cancel(carId: string): Promise<void> {
    await redis.del(`${PREFIX}${carId}`);
  },

  /** Called by cron job. Returns counts for observability. */
  async processAllDue(): Promise<{ sent: number; cancelled: number }> {
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [next, batch] = await redis.scan(cursor, "MATCH", `${PREFIX}*`, "COUNT", 100);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== "0");

    const carRepo = new CarRepository();
    const now = Date.now();
    let sent = 0;
    let cancelled = 0;

    for (const key of keys) {
      const carId = key.slice(PREFIX.length);
      const val = await redis.getdel(key);
      if (!val) continue;

      let entry: ReminderEntry;
      try {
        entry = JSON.parse(val) as ReminderEntry;
        // ponytail: migrate legacy entries that only had fireAt
        if (!entry.fireAt3d && entry.fireAt) {
          entry = { fireAt3d: entry.fireAt, fireAt7d: entry.fireAt + 4 * DAY_MS };
        }
      } catch {
        continue;
      }

      const car = await carRepo.findForIssue(carId);
      if (!car || car.status !== "ISSUED") {
        cancelled++;
        continue;
      }

      const groups = car.targetEmailGroups ?? [];
      const cc = car.targetEmailGroupsCc ?? [];
      const deptEmail = entry.deptEmailGroup ?? null;
      const issuerEmail = entry.issuerEmail ?? null;

      let didSend = false;

      // 3-day reminder: groups + dept email
      if (!entry.fired3d && entry.fireAt3d <= now) {
        const toTargets = [...new Set([...groups, ...(deptEmail ? [deptEmail] : [])])];
        for (const email of toTargets) {
          sendCarReminderEmail({ carId, carNo: car.carNo, targetEmail: email, cc, senderAccessToken: null }).catch((err) =>
            logger.error("[CarReminderService] 3d email failed", { carId, email, error: String(err) })
          );
          await carRepo.createNotificationLog({ carMasterId: carId, type: "REMINDER", recipient: email });
        }
        entry.fired3d = true;
        if (toTargets.length > 0) didSend = true;
      }

      // 7-day overdue: groups + dept email + issuer
      if (entry.fireAt7d <= now) {
        const toTargets = [...new Set([...groups, ...(deptEmail ? [deptEmail] : []), ...(issuerEmail ? [issuerEmail] : [])])];
        for (const email of toTargets) {
          sendCarOverdueEmail({ carId, carNo: car.carNo, targetEmail: email, cc, senderAccessToken: null }).catch((err) =>
            logger.error("[CarReminderService] 7d email failed", { carId, email, error: String(err) })
          );
          await carRepo.createNotificationLog({ carMasterId: carId, type: "OVERDUE", recipient: email });
        }
        if (toTargets.length > 0) didSend = true;
        // done — no more reminders once 7d fires
        if (didSend) sent++;
        continue;
      }

      // Restore key if not yet done
      if (didSend) sent++;
      await redis.set(key, JSON.stringify(entry), "EX", TTL_SEC);
    }

    return { sent, cancelled };
  },
};
