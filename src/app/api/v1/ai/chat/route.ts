import { z } from "zod";
import { errors, ok, rateLimit } from "@/lib/server/http";
import { generateCareerAnswer } from "@/lib/server/ai";

export const dynamic = "force-dynamic";

const chatSchema = z.object({
  message: z.string().min(2).max(2000),
  conversationId: z.string().uuid().optional(),
});

/**
 * Contextual AI career assistant.
 * The provider abstraction lives in `@/lib/server/ai` so the transport layer
 * never needs to know which model is behind the answer.
 */
export async function POST(request: Request) {
  if (!rateLimit("ai-chat", 20)) return errors.rateLimited();

  const body = await request.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);

  if (!parsed.success) {
    return errors.validation("Please enter a question of at least two characters.");
  }

  try {
    const result = await generateCareerAnswer(parsed.data.message);
    return ok(result, {
      provider: result.provider,
      model: result.model,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/v1/ai/chat] generation failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return errors.unavailable(
      "The career assistant is temporarily unavailable. Your data is safe — please try again in a moment.",
    );
  }
}
