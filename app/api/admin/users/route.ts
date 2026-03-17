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

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const [users, workspaces] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        workspaceId: true,
        workspace: { select: { name: true } },
        createdAt: true,
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workspace.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
  ]);

  return NextResponse.json({ users, workspaces });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { email, name, password, role, workspaceId } = await req.json();
  if (!email || !name || !password) return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });

  const normalizedRole = role === "ADMIN" ? "ADMIN" : "USER";
  const targetWorkspaceId = workspaceId as string | null;

  if (normalizedRole !== "ADMIN" && !targetWorkspaceId) {
    return NextResponse.json({ error: "workspaceId requis pour un USER" }, { status: 400 });
  }

  if (targetWorkspaceId) {
    const workspace = await prisma.workspace.findUnique({ where: { id: targetWorkspaceId }, select: { id: true } });
    if (!workspace) return NextResponse.json({ error: "Workspace introuvable" }, { status: 404 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name, password: hashed, role: normalizedRole, workspaceId: normalizedRole === "ADMIN" ? null : targetWorkspaceId },
    select: { id: true, email: true, name: true, role: true, workspaceId: true, workspace: { select: { name: true } }, createdAt: true, _count: { select: { sessions: true } } },
  });

  return NextResponse.json(user, { status: 201 });
}
