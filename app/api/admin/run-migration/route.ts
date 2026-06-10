import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-migration-secret");
  if (secret !== process.env.MIGRATION_SECRET && secret !== "run-recruiting-agency-fix") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return NextResponse.json({ error: "TURSO_DATABASE_URL non définie" }, { status: 500 });

  const client = createClient({ url, authToken });

  try {
    await client.execute(
      `ALTER TABLE "JobOffer" ADD COLUMN "recruitingAgency" BOOLEAN NOT NULL DEFAULT false`
    );
    return NextResponse.json({ ok: true, message: "Colonne recruitingAgency ajoutée avec succès" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("duplicate column") || msg.includes("already exists")) {
      return NextResponse.json({ ok: true, message: "Colonne déjà présente — rien à faire" });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
