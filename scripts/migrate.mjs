import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
const { rows } = await pool.query(`SELECT name FROM schema_migrations`);
const applied = new Set(rows.map((r) => r.name));

for (const file of files) {
  if (applied.has(file)) continue;
  console.log(`Applying ${file}...`);
  const sql = readFileSync(path.join(migrationsDir, file), "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [file]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

console.log("Migrations up to date.");
await pool.end();
