import { z } from "zod";
import { db } from "@/db";
import { careerProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureSeed } from "@/lib/server/seed";
import { getProfileBundle } from "@/lib/server/queries";
import { errors, ok, rateLimit } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  headline: z.string().max(160).nullable().optional(),
  college: z.string().max(160).nullable().optional(),
  degree: z.string().max(120).nullable().optional(),
  branch: z.string().max(120).nullable().optional(),
  academicYear: z.string().max(40).nullable().optional(),
  semester: z.number().int().min(1).max(12).nullable().optional(),
  cgpa: z.number().min(0).max(10).nullable().optional(),
  careerGoal: z.string().max(160).nullable().optional(),
  targetRole: z.string().max(120).nullable().optional(),
  targetCompany: z.string().max(120).nullable().optional(),
  preferredStack: z.array(z.string().max(40)).max(12).optional(),
  learningStyle: z.string().max(60).nullable().optional(),
  studyHoursPerDay: z.number().min(0).max(16).nullable().optional(),
  placementTimelineMonths: z.number().int().min(1).max(48).nullable().optional(),
  summary: z.string().max(1200).nullable().optional(),
});

export async function GET() {
  if (!rateLimit("profile", 60)) return errors.rateLimited();
  const { user, profile } = await getProfileBundle();
  return ok({ user, profile });
}

export async function PUT(request: Request) {
  if (!rateLimit("profile-write", 12)) return errors.rateLimited();

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return errors.validation(
      "Some of the profile details are not valid.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const userId = await ensureSeed();
  const values = parsed.data;

  if (values.fullName !== undefined || values.headline !== undefined) {
    await db
      .update(users)
      .set({
        ...(values.fullName !== undefined ? { fullName: values.fullName } : {}),
        ...(values.headline !== undefined ? { headline: values.headline } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  const profileValues: Record<string, unknown> = {};
  for (const key of [
    "college",
    "degree",
    "branch",
    "academicYear",
    "semester",
    "cgpa",
    "careerGoal",
    "targetRole",
    "targetCompany",
    "preferredStack",
    "learningStyle",
    "studyHoursPerDay",
    "placementTimelineMonths",
    "summary",
  ] as const) {
    const value = (values as Record<string, unknown>)[key];
    if (value !== undefined) profileValues[key] = value;
  }

  if (Object.keys(profileValues).length > 0) {
    await db
      .update(careerProfiles)
      .set({ ...profileValues, updatedAt: new Date() })
      .where(eq(careerProfiles.userId, userId));
  }

  const { user, profile } = await getProfileBundle();
  return ok({ user, profile });
}
