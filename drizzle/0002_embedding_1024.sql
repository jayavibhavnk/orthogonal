-- Switch embedding vectors to 1024-dim serverless model (multilingual-e5-large-instruct)

DROP INDEX IF EXISTS "context_embeddings_hnsw_idx";

TRUNCATE "context_embeddings";

ALTER TABLE "context_embeddings"
  ALTER COLUMN "embedding" TYPE vector(1024);

CREATE INDEX IF NOT EXISTS "context_embeddings_hnsw_idx"
  ON "context_embeddings"
  USING hnsw ("embedding" vector_cosine_ops);
