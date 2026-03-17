import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (!user || user.role !== "ADMIN") return null;
  return session;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Nom de workspace requis" }, { status: 400 });
  }

  const workspace = await prisma.workspace.update({
    where: { id },
    data: { name: name.trim() },
    select: { id: true, name: true, createdAt: true, _count: { select: { users: true, jobOffers: true, customFields: true } } },
  });

  return NextResponse.json(workspace);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    select: { _count: { select: { users: true, jobOffers: true, customFields: true } } },
  });

  if (!workspace) return NextResponse.json({ error: "Workspace introuvable" }, { status: 404 });

  if (workspace._count.users > 0 || workspace._count.jobOffers > 0 || workspace._count.customFields > 0) {
    return NextResponse.json(
      { error: "Impossible de supprimer un workspace non vide (utilisateurs, offres ou champs personnalisés)." },
      { status: 409 }
    );
  }

  await prisma.workspace.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
