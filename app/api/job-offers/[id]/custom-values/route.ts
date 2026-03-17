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

  const userId = session.user.id;
  const { id } = await params;
  const { fieldName, value } = await req.json();

  if (!fieldName || typeof fieldName !== "string" || fieldName.trim() === "") {
    return NextResponse.json({ error: "fieldName invalide" }, { status: 400 });
  }

  const offer = await prisma.jobOffer.findFirst({ where: { id, userId } });
  if (!offer) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let currentValues: Record<string, unknown> = {};
  try {
    currentValues = JSON.parse(offer.customValues ?? "{}");
  } catch {
    currentValues = {};
  }

  const updated = await prisma.jobOffer.update({
    where: { id },
    data: {
      customValues: JSON.stringify({ ...currentValues, [fieldName]: value }),
    },
  });

  let updatedCustomValues: Record<string, unknown> = {};
  try {
    updatedCustomValues = JSON.parse(updated.customValues ?? "{}");
  } catch {
    updatedCustomValues = {};
  }

  return NextResponse.json({ ...updated, customValues: updatedCustomValues });
}
