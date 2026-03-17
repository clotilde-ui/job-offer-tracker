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

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const [workspaces, users] = await Promise.all([
    prisma.workspace.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { users: true, jobOffers: true, customFields: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "USER" },
      select: { id: true, name: true, email: true, workspaceId: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({ workspaces, users });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Nom de workspace requis" }, { status: 400 });
  }

  const workspace = await prisma.workspace.create({
    data: { name: name.trim() },
    select: { id: true, name: true, createdAt: true, _count: { select: { users: true, jobOffers: true, customFields: true } } },
  });

  return NextResponse.json(workspace, { status: 201 });
}
