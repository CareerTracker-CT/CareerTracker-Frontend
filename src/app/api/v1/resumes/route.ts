import { getResumeRecords, getSkillRecords, getRoadmapTasks } from "@/lib/server/queries";
import { errors, ok, rateLimit } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!rateLimit("resumes", 30)) return errors.rateLimited();
  const records = await getResumeRecords();
  return ok(records, {
    total: records.length,
    current: records.find((r) => r.isCurrent)?.id ?? null,
  });
}
