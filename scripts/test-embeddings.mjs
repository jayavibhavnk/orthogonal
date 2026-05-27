import { neon } from "@neondatabase/serverless";
import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const text = readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // ignore
  }
}

loadEnv();

const EMBEDDING_MODEL = "intfloat/multilingual-e5-large-instruct";

async function embedText(text, mode = "passage") {
  const prefix = mode === "query" ? "query: " : "passage: ";
  const together = createOpenAI({
    baseURL: "https://api.together.xyz/v1",
    apiKey: process.env.TOGETHER_API_KEY,
    name: "together",
  });
  const { embedding } = await embed({
    model: together.embedding(EMBEDDING_MODEL),
    value: `${prefix}${text.trim()}`.slice(0, 8000),
  });
  return embedding;
}

function toVectorLiteral(values) {
  return `[${values.join(",")}]`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !process.env.TOGETHER_API_KEY) {
    console.error("Missing DATABASE_URL or TOGETHER_API_KEY");
    process.exit(1);
  }

  const sql = neon(url);
  const userId = crypto.randomUUID();
  const chatId = crypto.randomUUID();
  const sourceId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();

  await sql`INSERT INTO users (id, email, password_hash) VALUES (${userId}::uuid, ${`embed-test-${Date.now()}@test.local`}, 'test')`;
  await sql`INSERT INTO sessions (id, user_id) VALUES (${sessionId}::uuid, ${userId}::uuid)`;
  await sql`INSERT INTO chats (id, session_id, user_id, title) VALUES (${chatId}::uuid, ${sessionId}::uuid, ${userId}::uuid, 'embed test')`;

  const content =
    "Fundable API returned Series A fintech companies including Stripe and Plaid in San Francisco";
  const embedding = await embedText(content, "passage");
  console.log("embed dims:", embedding.length);

  await sql`
    INSERT INTO context_embeddings (user_id, chat_id, source_type, source_id, content, embedding)
    VALUES (
      ${userId}::uuid,
      ${chatId}::uuid,
      'artifact'::embedding_source_type,
      ${sourceId}::uuid,
      ${content},
      ${toVectorLiteral(embedding)}::vector
    )
  `;

  const queryEmbedding = await embedText("fintech funding San Francisco", "query");
  const hits = await sql`
    SELECT content, 1 - (embedding <=> ${toVectorLiteral(queryEmbedding)}::vector) AS similarity
    FROM context_embeddings
    WHERE user_id = ${userId}::uuid AND chat_id = ${chatId}::uuid
    ORDER BY embedding <=> ${toVectorLiteral(queryEmbedding)}::vector
    LIMIT 3
  `;

  console.log("search hits:", hits.length, "top sim:", Number(hits[0]?.similarity).toFixed(3));

  await sql`DELETE FROM chats WHERE id = ${chatId}::uuid`;
  await sql`DELETE FROM users WHERE id = ${userId}::uuid`;
  await sql`DELETE FROM sessions WHERE id = ${sessionId}::uuid`;

  if (embedding.length !== 1024) process.exit(1);
  if (!hits.length || Number(hits[0].similarity) < 0.3) process.exit(1);
  console.log("EMBEDDING TESTS PASSED");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
