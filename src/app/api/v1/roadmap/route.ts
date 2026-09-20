import { getRoadmapTasks } from "@/lib/server/queries";
import { errors, ok, rateLimit } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!rateLimit("roadmap", 40)) return errors.rateLimited();
  const tasks = await getRoadmapTasks();

  const phases = Array.from(new Set(tasks.map((t) => t.phase))).map((phase) => {
    const items = tasks.filter((t) => t.phase === phase);
    return {
      phase,
      name: items[0]?.phaseName ?? `Phase ${phase}`,
      total: items.length,
      completed: items.filter((t) => t.status === "COMPLETED").length,
      progress: Math.round(items.reduce((acc, t) => acc + t.progress, 0) / (items.length || 1)),
      estimatedHours: items.reduce((acc, t) => acc + t.estimatedHours, 0),
    };
  });

  return ok(tasks, { phases });
}
