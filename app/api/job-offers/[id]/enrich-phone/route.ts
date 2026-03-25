import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const offer = await prisma.jobOffer.findUnique({ where: { id } });
  if (!offer) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (session.user.role !== "ADMIN" && offer.workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  if (!offer.leadLinkedin) {
    return NextResponse.json({ error: "URL LinkedIn manquante" }, { status: 400 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: offer.workspaceId },
    select: { apolloApiKey: true },
  });
  const apolloApiKey = workspace?.apolloApiKey ?? process.env.APOLLO_API_KEY;
  if (!apolloApiKey) {
    return NextResponse.json({ error: "Clé API Apollo non configurée" }, { status: 500 });
  }

  await prisma.jobOffer.update({
    where: { id },
    data: { apolloEnrichmentStatus: "pending" },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  const webhookUrl = `${baseUrl}/api/webhooks/apollo-phone?contact_id=${id}`;

  try {
    const res = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": apolloApiKey,
      },
      body: JSON.stringify({
        linkedin_url: offer.leadLinkedin,
        reveal_phone_number: true,
        webhook_url: webhookUrl,
      }),
    });

    if (!res.ok) {
      await prisma.jobOffer.update({ where: { id }, data: { apolloEnrichmentStatus: "failed" } });
      return NextResponse.json({ error: "Erreur Apollo API" }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: "Enrichissement en cours" });
  } catch (err) {
    console.error("Erreur Apollo:", err);
    await prisma.jobOffer.update({ where: { id }, data: { apolloEnrichmentStatus: "failed" } });
    return NextResponse.json({ error: "Erreur de connexion à Apollo" }, { status: 502 });
  }
}
