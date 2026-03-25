import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Normalise une URL LinkedIn au format strict attendu par Apollo.
 *  Ex: "https://www.linkedin.com/in/jean-dupont/?trk=xxx" → "https://www.linkedin.com/in/jean-dupont"
 */
function normalizeLinkedinUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const match = url.pathname.match(/^\/(in\/[^/?#]+)/);
    if (!match) return null;
    return `https://www.linkedin.com/${match[1]}`;
  } catch {
    return null;
  }
}

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

  const linkedinUrl = normalizeLinkedinUrl(offer.leadLinkedin);
  if (!linkedinUrl) {
    return NextResponse.json({ error: "Format d'URL LinkedIn invalide" }, { status: 400 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: offer.workspaceId },
    select: { apolloApiKey: true },
  });
  const apolloApiKey = workspace?.apolloApiKey ?? process.env.APOLLO_API_KEY;
  if (!apolloApiKey) {
    return NextResponse.json({ error: "Clé API Apollo non configurée" }, { status: 500 });
  }

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
  if (!baseUrl) {
    console.error("[Apollo] NEXTAUTH_URL non défini — le webhook Apollo ne pourra pas être reçu");
  }
  const webhookUrl = `${baseUrl}/api/webhooks/apollo-phone?contact_id=${id}`;

  await prisma.jobOffer.update({
    where: { id },
    data: { apolloEnrichmentStatus: "pending" },
  });

  console.log(`[Apollo] Envoi enrichissement — linkedin: ${linkedinUrl} — webhook: ${webhookUrl}`);

  try {
    const res = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": apolloApiKey,
      },
      body: JSON.stringify({
        linkedin_url: linkedinUrl,
        reveal_phone_number: true,
        webhook_url: webhookUrl,
      }),
    });

    const responseBody = await res.json().catch(() => null);
    console.log(`[Apollo] Réponse HTTP ${res.status}:`, JSON.stringify(responseBody));

    if (!res.ok) {
      await prisma.jobOffer.update({ where: { id }, data: { apolloEnrichmentStatus: "failed" } });
      return NextResponse.json({ error: "Erreur Apollo API", detail: responseBody }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: "Enrichissement en cours" });
  } catch (err) {
    console.error("[Apollo] Erreur de connexion:", err);
    await prisma.jobOffer.update({ where: { id }, data: { apolloEnrichmentStatus: "failed" } });
    return NextResponse.json({ error: "Erreur de connexion à Apollo" }, { status: 502 });
  }
}
