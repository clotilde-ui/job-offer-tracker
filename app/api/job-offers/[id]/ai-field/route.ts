import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

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

  const [offer, field] = await Promise.all([
    prisma.jobOffer.findFirst({ where: { id: offerId, userId } }),
    prisma.customFieldDef.findFirst({ where: { id: fieldId, userId } }),
  ]);

  if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  if (!field) return NextResponse.json({ error: "Champ introuvable" }, { status: 404 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY non configurée sur le serveur" },
      { status: 500 }
    );
  }

  const offerContext = [
    `Titre : ${offer.title}`,
    `Entreprise : ${offer.company}`,
    offer.description ? `Description : ${offer.description}` : null,
    offer.offerLocation ? `Localisation : ${offer.offerLocation}` : null,
    offer.source ? `Source : ${offer.source}` : null,
    offer.leadFirstName || offer.leadLastName
      ? `Lead : ${[offer.leadCivility, offer.leadFirstName, offer.leadLastName].filter(Boolean).join(" ")}`
      : null,
    offer.leadJobTitle ? `Poste du lead : ${offer.leadJobTitle}` : null,
    offer.leadEmail ? `Email lead : ${offer.leadEmail}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `${prompt}\n\nDonnées de l'offre :\n${offerContext}\n\nRéponds de manière concise.`,
      },
    ],
  });

  const value =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";

  const customValues = JSON.parse(offer.customValues || "{}");
  customValues[field.name] = value;

  await prisma.jobOffer.update({
    where: { id: offerId },
    data: { customValues: JSON.stringify(customValues) },
  });

  return NextResponse.json({ value });
}
