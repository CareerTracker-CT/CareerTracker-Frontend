import { getDashboard } from "@/lib/server/queries";
import { errors, ok, rateLimit } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!rateLimit("dashboard", 60)) return errors.rateLimited();
  try {
    const data = await getDashboard();
    return ok(data, { cached: false, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[api/v1/dashboard] failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return errors.internal();
  }
}
