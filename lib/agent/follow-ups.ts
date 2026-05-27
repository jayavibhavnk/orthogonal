import { generateObject } from "ai";
import { z } from "zod";
import { togetherModel } from "@/lib/agent/together";
import { EXECUTOR_MODEL_ID } from "@/lib/agent/models";

const followUpSchema = z.object({
  suggestions: z.array(z.string()).length(4),
});

export async function generateFollowUps(answer: string) {
  const { object } = await generateObject({
    model: togetherModel(EXECUTOR_MODEL_ID),
    schema: followUpSchema,
    prompt: `Based on this assistant answer, suggest 4 concise follow-up questions the user might ask next. Make them specific and actionable.

Answer:
${answer}`,
  });

  return object.suggestions;
}
