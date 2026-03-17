import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const offer = await prisma.jobOffer.findFirst({ where: { id, userId } });
  if (!offer) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.jobOffer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
