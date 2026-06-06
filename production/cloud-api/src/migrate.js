// Lightweight migration runner — executes sql/schema.sql idempotently.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "./lib/db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(here, "..", "sql", "schema.sql");

const sql = await readFile(schemaPath, "utf8");
console.log(`Applying ${schemaPath} (${sql.length} bytes)…`);
await pool.query(sql);
console.log("✔ schema applied");
await pool.end();
