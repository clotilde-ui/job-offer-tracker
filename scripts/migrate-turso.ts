import "dotenv/config";
import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.log("TURSO_DATABASE_URL non définie — migrations ignorées.");
  process.exit(0);
}

const client = createClient({ url, authToken });

async function run() {
  // Table de suivi des migrations appliquées
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_app_migrations" (
      name    TEXT NOT NULL PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const { rows } = await client.execute(`SELECT name FROM "_app_migrations"`);
  const applied = new Set(rows.map((r) => r.name as string));

  const migrationsDir = path.join(process.cwd(), "prisma/migrations");
  const folders = fs
    .readdirSync(migrationsDir)
    .filter((f) => fs.statSync(path.join(migrationsDir, f)).isDirectory())
    .sort();

  for (const folder of folders) {
    if (applied.has(folder)) {
      console.log(`  ✓ (déjà appliquée) ${folder}`);
      continue;
    }

    const sqlFile = path.join(migrationsDir, folder, "migration.sql");
    if (!fs.existsSync(sqlFile)) continue;

    const statements = fs
      .readFileSync(sqlFile, "utf-8")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    let ok = true;
    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const isAlreadyDone =
          msg.includes("already exists") ||
          msg.includes("duplicate column") ||
          msg.includes("UNIQUE constraint");
        if (isAlreadyDone) {
          console.log(`    (déjà présent) ${stmt.slice(0, 70)}`);
        } else {
          console.error(`  ✗ ${folder}: ${msg}`);
          ok = false;
          break;
        }
      }
    }

    if (ok) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO "_app_migrations" (name) VALUES (?)`,
        args: [folder],
      });
      console.log(`  ✓ Migration appliquée : ${folder}`);
    }
  }

  console.log("Migrations Turso terminées.");
}

run().catch((e) => {
  console.error("Erreur migration Turso :", e);
  process.exit(1);
});
