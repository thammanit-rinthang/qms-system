import { db } from "../lib/db";

async function main() {
  // Check appointments and their members
  const appts = await db.auditAppointment.findMany({
    include: { members: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log("=== Recent Appointments ===");
  for (const a of appts) {
    console.log(`  ${a.appointmentNo} | members: ${a.members.length}`);
    for (const m of a.members) console.log(`    - ${m.name} (${m.role})`);
  }

  // Check plans
  const plans = await db.auditPlan.findMany({
    where: { auditNo: { in: ["AUD-26-001", "AUD-26-002"] } },
    select: { auditNo: true, appointmentId: true },
  });
  console.log("\n=== Plans ===");
  for (const p of plans) console.log(`  ${p.auditNo} | appointmentId: ${p.appointmentId}`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
