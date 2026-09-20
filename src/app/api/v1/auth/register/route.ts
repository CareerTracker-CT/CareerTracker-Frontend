import { z } from "zod";
import { errors, ok, rateLimit } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name.").max(120),
  email: z.string().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Include at least one uppercase letter.")
    .regex(/[0-9]/, "Include at least one number."),
});

export async function POST(request: Request) {
  if (!rateLimit("auth-register", 5, 300_000)) {
    return errors.rateLimited("Too many registration attempts. Please try again later.");
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return errors.validation(
      "Please correct the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  return ok({
    status: "PENDING_VERIFICATION",
    message:
      "Registration is validated on the client. Start the verification flow to continue to onboarding.",
    nextStep: "/onboarding",
  });
}
