import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { id } = await params;
  const { fieldName, value } = await req.json();

  const offer = await prisma.jobOffer.findFirst({ where: { id, userId } });
  if (!offer) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const currentValues: Record<string, unknown> = JSON.parse(offer.customValues ?? "{}");
  const updated = await prisma.jobOffer.update({
    where: { id },
    data: {
      customValues: JSON.stringify({ ...currentValues, [fieldName]: value }),
    },
  });

  return NextResponse.json({
    ...updated,
    customValues: JSON.parse(updated.customValues ?? "{}"),
  });
}
