import { ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST() {
  return ok({ status: "SIGNED_OUT" });
}
