import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureRecruitingAgencyColumn } from "@/lib/job-offer-schema";

const ALLOWED_BOOLEAN_FIELDS = ["recruitingAgency"] as const;
type AllowedBooleanField = typeof ALLOWED_BOOLEAN_FIELDS[number];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  await ensureRecruitingAgencyColumn();

  const offer = await prisma.jobOffer.findUnique({ where: { id } });
  if (!offer) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (session.user.role !== "ADMIN" && offer.workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const { field, value } = body;

  if (!ALLOWED_BOOLEAN_FIELDS.includes(field as AllowedBooleanField) || typeof value !== "boolean") {
    return NextResponse.json({ error: "Champ invalide" }, { status: 400 });
  }

  const updated = await prisma.jobOffer.update({ where: { id }, data: { [field]: value } });
  return NextResponse.json(updated);
}
