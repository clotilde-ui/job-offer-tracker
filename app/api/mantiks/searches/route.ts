import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/workspace-access";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });

  const workspaceId = resolveWorkspaceId(session, req);
  if (!workspaceId) return NextResponse.json({ error: "Workspace requis" }, { status: 400 });

  const searches = await prisma.mantikSearch.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, filters: true, createdAt: true },
  });

  return NextResponse.json(searches.map((s: { id: string; name: string; filters: string; createdAt: Date }) => ({ ...s, filters: JSON.parse(s.filters) })));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });

  const workspaceId = resolveWorkspaceId(session, req);
  if (!workspaceId) return NextResponse.json({ error: "Workspace requis" }, { status: 400 });

  const body = await req.json();
  const { name, filters } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  if (!filters) return NextResponse.json({ error: "Filtres requis" }, { status: 400 });

  const search = await prisma.mantikSearch.create({
    data: { workspaceId, name: name.trim(), filters: JSON.stringify(filters) },
  });

  return NextResponse.json({ ...search, filters });
}
