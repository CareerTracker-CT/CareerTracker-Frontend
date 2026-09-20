import { getProjectRecords } from "@/lib/server/queries";
import { errors, ok, rateLimit } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!rateLimit("projects", 40)) return errors.rateLimited();
  const records = await getProjectRecords();
  return ok(records, {
    total: records.length,
    shipped: records.filter((p) => p.status === "SHIPPED").length,
    totalImpact: records.reduce((acc, p) => acc + p.readinessImpact, 0),
  });
}
