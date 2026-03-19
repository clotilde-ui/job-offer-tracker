import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/workspace-access";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });

  const workspaceId = resolveWorkspaceId(session, req);
  if (!workspaceId) return NextResponse.json({ error: "Workspace requis" }, { status: 400 });

  const existing = await prisma.mantikSearch.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) return NextResponse.json({ error: "Recherche introuvable" }, { status: 404 });

  await prisma.mantikSearch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
