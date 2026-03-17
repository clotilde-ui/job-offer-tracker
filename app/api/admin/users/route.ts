import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const userId = session.user.id;
  const role = session.user.role;
  if (role !== "ADMIN") return null;
  // Revalidate role against DB to prevent stale session abuse
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      webhookToken: true,
      lgmApiKey: true,
      lgmCampaignId: true,
      createdAt: true,
      _count: { select: { jobOffers: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Mask lgmApiKey — the admin UI only needs to know if it's configured
  const masked = users.map((user: (typeof users)[number]) => ({
    ...user,
    lgmApiKey: user.lgmApiKey ? "••••••••" : null,
  }));

  return NextResponse.json(masked);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { email, name, password, role } = await req.json();

  if (!email || !name || !password) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, name, password: hashed, role: role ?? "USER" },
    select: { id: true, email: true, name: true, role: true, webhookToken: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
