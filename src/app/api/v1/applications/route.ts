import { z } from "zod";
import { getApplicationRecords } from "@/lib/server/queries";
import { errors, ok, rateLimit } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!rateLimit("applications", 40)) return errors.rateLimited();

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");

  const valid = [
    "SAVED",
    "APPLIED",
    "SCREENING",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
    "WITHDRAWN",
  ] as const;

  if (statusParam && !valid.includes(statusParam as (typeof valid)[number])) {
    return errors.validation("That application status is not recognised.");
  }

  const records = await getApplicationRecords();
  const filtered = statusParam ? records.filter((r) => r.status === statusParam) : records;

  return ok(filtered, {
    total: filtered.length,
    counts: Object.fromEntries(valid.map((s) => [s, records.filter((r) => r.status === s).length])),
  });
}

const createSchema = z.object({
  company: z.string().min(2).max(140),
  role: z.string().min(2).max(140),
  status: z.enum(["SAVED", "APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"]),
  jobUrl: z.string().url().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  source: z.string().max(80).nullable().optional(),
});

export async function POST(request: Request) {
  if (!rateLimit("applications-write", 20)) return errors.rateLimited();
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return errors.validation(
      "Please complete the required application details.",
      parsed.error.flatten().fieldErrors,
    );
  }

  // Honest response: persistence is wired to the write contract but the demo
  // tenant is read-only, so we return an explicit conflict rather than
  // pretending the record was stored.
  return errors.conflict(
    "Creating applications is disabled in the demo workspace. Connect the backend database to enable writes.",
  );
}
