import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
  const { name, email, password, role, workspaceId } = await req.json();

  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (password) data.password = await bcrypt.hash(password, 12);
  if (role) data.role = role;
  if (workspaceId !== undefined) data.workspaceId = workspaceId;

  const nextRole = role;
  if (nextRole === "ADMIN") {
    data.workspaceId = null;
  } else if (nextRole === "USER" && workspaceId === undefined) {
    const current = await prisma.user.findUnique({ where: { id }, select: { workspaceId: true } });
    if (!current?.workspaceId) {
      return NextResponse.json({ error: "workspaceId requis pour un USER" }, { status: 400 });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, workspaceId: true, workspace: { select: { name: true } } },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const { id } = await params;
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
