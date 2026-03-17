import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL manquante");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function run() {
  const migrationsDir = path.join(process.cwd(), "prisma/migrations");
  const folders = fs.readdirSync(migrationsDir).sort();

  for (const folder of folders) {
    const sqlFile = path.join(migrationsDir, folder, "migration.sql");
    if (!fs.existsSync(sqlFile)) continue;

    const sql = fs.readFileSync(sqlFile, "utf-8");
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      try {
        await client.execute(stmt);
        console.log(`✓ ${folder}: ${stmt.slice(0, 60)}...`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("duplicate column") || msg.includes("already exists")) {
          console.log(`  (déjà appliqué) ${stmt.slice(0, 60)}`);
        } else {
          console.error(`✗ ${folder}: ${msg}`);
        }
      }
    }
  }

  console.log("\nMigrations terminées.");
}

run().catch(console.error);
