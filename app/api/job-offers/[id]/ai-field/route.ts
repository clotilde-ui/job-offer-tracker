import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callAIProvider } from "@/lib/ai-generate";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { id: offerId } = await params;
  const { fieldId, prompt } = await req.json();

  if (!fieldId || !prompt) {
    return NextResponse.json({ error: "fieldId et prompt requis" }, { status: 400 });
  }

  const [offer, field, user] = await Promise.all([
    prisma.jobOffer.findFirst({ where: { id: offerId, userId } }),
    prisma.customFieldDef.findFirst({ where: { id: fieldId, userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { aiProvider: true, claudeApiKey: true, geminiApiKey: true, groqApiKey: true, openaiApiKey: true },
    }),
  ]);

  if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  if (!field) return NextResponse.json({ error: "Champ introuvable" }, { status: 404 });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  try {
    const value = await callAIProvider(user, prompt, offer);

    const customValues = JSON.parse(offer.customValues || "{}");
    customValues[field.name] = value;
    await prisma.jobOffer.update({
      where: { id: offerId },
      data: { customValues: JSON.stringify(customValues) },
    });

    return NextResponse.json({ value });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur IA";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
