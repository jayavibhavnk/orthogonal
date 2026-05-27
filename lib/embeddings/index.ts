export { embedText, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "./client";
export {
  storeEmbedding,
  searchSimilarContext,
  safeStoreEmbedding,
} from "./store";

export function extractTextFromParts(parts: unknown[]): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part): part is { type: string; text?: string } => {
      return typeof part === "object" && part != null && "type" in part;
    })
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}
