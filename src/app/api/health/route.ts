import { ok } from "@/lib/server/http";

/**
 * Liveness probe. Kept dependency-free so the platform health check never
 * depends on the database being warm.
 */
export function GET() {
  return ok({
    status: "ok",
    service: "careertracker-api",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
}
