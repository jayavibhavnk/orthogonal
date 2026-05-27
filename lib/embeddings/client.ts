import { embed } from "ai";
import { createTogetherProvider } from "@/lib/agent/together";

export const EMBEDDING_MODEL = "intfloat/multilingual-e5-large-instruct";
export const EMBEDDING_DIMENSIONS = 1024;

export async function embedText(
  text: string,
  mode: "query" | "passage" = "passage",
): Promise<number[]> {
  const prefix = mode === "query" ? "query: " : "passage: ";
  const trimmed = `${prefix}${text.trim()}`.slice(0, 8000);
  if (!trimmed || trimmed === prefix.trim()) {
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  const together = createTogetherProvider();
  const { embedding } = await embed({
    model: together.embedding(EMBEDDING_MODEL),
    value: trimmed,
  });

  return embedding;
}
