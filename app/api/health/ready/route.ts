import { HealthService } from "@/services/healthService";

export async function GET() {
  const checks = await HealthService.checkReadiness();
  const healthy = checks.database === "ok" && checks.redis === "ok";

  return Response.json(
    { status: healthy ? "ok" : "not_ready", services: checks },
    { status: healthy ? 200 : 503 }
  );
}
