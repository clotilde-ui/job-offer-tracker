import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const { phoneLookupRequested, enrichedPhone } = await req.json();

  const offer = await prisma.jobOffer.findUnique({ where: { id } });
  if (!offer) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (session.user.role !== "ADMIN" && offer.workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const updated = await prisma.jobOffer.update({
    where: { id },
    data: {
      ...(typeof phoneLookupRequested === "boolean" ? { phoneLookupRequested } : {}),
      ...(enrichedPhone !== undefined
        ? { enrichedPhone: typeof enrichedPhone === "string" && enrichedPhone.trim() !== "" ? enrichedPhone.trim() : null }
        : {}),
    },
    select: { id: true, phoneLookupRequested: true, enrichedPhone: true },
  });

  return NextResponse.json(updated);
}
