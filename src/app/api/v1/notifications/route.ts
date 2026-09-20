import { z } from "zod";
import { getNotificationRecords, markNotificationRead } from "@/lib/server/queries";
import { errors, ok, rateLimit } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!rateLimit("notifications", 60)) return errors.rateLimited();
  const records = await getNotificationRecords();
  return ok(records, {
    total: records.length,
    unread: records.filter((r) => !r.readAt).length,
  });
}

const readSchema = z.object({ id: z.string().uuid() });

export async function PATCH(request: Request) {
  if (!rateLimit("notifications-write", 60)) return errors.rateLimited();
  const body = await request.json().catch(() => null);
  const parsed = readSchema.safeParse(body);

  if (!parsed.success) {
    return errors.validation("A valid notification id is required.");
  }

  const records = await markNotificationRead(parsed.data.id);
  return ok(records);
}
