import { getSkillRecords, skillCoverage } from "@/lib/server/queries";
import { errors, ok, rateLimit } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!rateLimit("skills", 40)) return errors.rateLimited();
  const records = await getSkillRecords();
  return ok(records, {
    total: records.length,
    coverage: skillCoverage(records),
    highPriorityGaps: records.filter((s) => s.priority === "HIGH" && s.currentLevel < s.requiredLevel)
      .length,
  });
}
