import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const field = await prisma.customFieldDef.findUnique({ where: { id } });
  if (!field) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (session.user.role !== "ADMIN" && field.workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  await prisma.customFieldDef.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
