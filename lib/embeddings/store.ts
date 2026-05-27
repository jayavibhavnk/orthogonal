import { neon } from "@neondatabase/serverless";
import { embedText } from "@/lib/embeddings/client";

type SourceType = "message" | "artifact" | "compaction";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

function toVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

export async function storeEmbedding(input: {
  userId: string;
  chatId: string;
  sourceType: SourceType;
  sourceId: string;
  content: string;
}) {
  const text = input.content.trim().slice(0, 12000);
  if (!text) return null;

  const embedding = await embedText(text, "passage");
  const sql = getSql();

  const rows = await sql`
    INSERT INTO context_embeddings (user_id, chat_id, source_type, source_id, content, embedding)
    VALUES (
      ${input.userId}::uuid,
      ${input.chatId}::uuid,
      ${input.sourceType}::embedding_source_type,
      ${input.sourceId}::uuid,
      ${text},
      ${toVectorLiteral(embedding)}::vector
    )
    ON CONFLICT (source_type, source_id)
    DO UPDATE SET content = EXCLUDED.content, embedding = EXCLUDED.embedding
    RETURNING id
  `;

  return rows[0]?.id ?? null;
}

export async function searchSimilarContext(input: {
  userId: string;
  chatId: string;
  query: string;
  limit?: number;
}) {
  const limit = input.limit ?? 5;
  const queryEmbedding = await embedText(input.query, "query");
  const sql = getSql();

  const rows = await sql`
    SELECT
      id,
      source_type,
      source_id,
      content,
      1 - (embedding <=> ${toVectorLiteral(queryEmbedding)}::vector) AS similarity
    FROM context_embeddings
    WHERE user_id = ${input.userId}::uuid
      AND chat_id = ${input.chatId}::uuid
    ORDER BY embedding <=> ${toVectorLiteral(queryEmbedding)}::vector
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: String(row.id),
    sourceType: String(row.source_type),
    sourceId: String(row.source_id),
    content: String(row.content),
    similarity: Number(row.similarity),
  }));
}

export async function safeStoreEmbedding(
  input: Parameters<typeof storeEmbedding>[0],
) {
  try {
    return await storeEmbedding(input);
  } catch (error) {
    console.error("[embeddings] store failed:", error);
    return null;
  }
}
