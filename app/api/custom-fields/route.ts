import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = ["TEXT", "NUMBER", "BOOLEAN", "DATE"] as const;
type FieldType = (typeof ALLOWED_TYPES)[number];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = session.user.id;
  const fields = await prisma.customFieldDef.findMany({
    where: { userId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(fields);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = session.user.id;
  const { label, type } = await req.json();

  if (!label || typeof label !== "string" || label.trim() === "") {
    return NextResponse.json({ error: "Label requis" }, { status: 400 });
  }

  const fieldType: FieldType = ALLOWED_TYPES.includes(type) ? type : "TEXT";

  const name = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_");

  // Vérifie les collisions de nom pour cet utilisateur
  const existing = await prisma.customFieldDef.findFirst({ where: { userId, name } });
  if (existing) {
    return NextResponse.json(
      { error: "Un champ avec ce nom existe déjà. Choisissez un label différent." },
      { status: 409 }
    );
  }

  const count = await prisma.customFieldDef.count({ where: { userId } });

  const field = await prisma.customFieldDef.create({
    data: { userId, name, label, type: fieldType, order: count },
  });

  return NextResponse.json(field, { status: 201 });
}
