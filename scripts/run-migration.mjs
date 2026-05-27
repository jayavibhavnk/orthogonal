import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const migrationPath = resolve(process.cwd(), "drizzle/0001_auth_vectors.sql");
  const sqlText = readFileSync(migrationPath, "utf8");
  const statements = sqlText
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  const sql = neon(url);
  for (const statement of statements) {
    console.log(`Running: ${statement.slice(0, 80)}…`);
    await sql.query(statement);
  }

  const migration2Path = resolve(process.cwd(), "drizzle/0002_embedding_1024.sql");
  try {
    const sqlText2 = readFileSync(migration2Path, "utf8");
    const statements2 = sqlText2
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of statements2) {
      console.log(`Running: ${statement.slice(0, 80)}…`);
      await sql.query(statement);
    }
  } catch {
    // optional second migration file
  }

  console.log("Migration complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
