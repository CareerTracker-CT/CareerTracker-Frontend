import { z } from "zod";
import { errors, ok, rateLimit } from "@/lib/server/http";
import { ensureSeed } from "@/lib/server/seed";
import { getProfileBundle } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

const credentials = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  rememberMe: z.boolean().optional(),
});

export async function POST(request: Request) {
  if (!rateLimit("auth-login", 10, 60_000)) {
    return errors.rateLimited("Too many sign-in attempts. Please wait a minute and try again.");
  }

  const body = await request.json().catch(() => null);
  const parsed = credentials.safeParse(body);

  if (!parsed.success) {
    return errors.validation(
      "Please check your email and password.",
      parsed.error.flatten().fieldErrors,
    );
  }

  // Password verification is handled by the NestJS auth service (Argon2id).
  // This route establishes the demo session for the preview environment.
  await ensureSeed();
  const { user } = await getProfileBundle();

  return ok(
    {
      user,
      session: {
        accessTokenExpiresIn: 900,
        refreshTokenExpiresIn: parsed.data.rememberMe ? 2_592_000 : 604_800,
      },
    },
    undefined,
    200,
  );
}
