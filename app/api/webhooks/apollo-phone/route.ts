import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ApolloPhoneNumber {
  sanitized_number?: string;
  status_cd?: string;
  type_cd?: string;
}

interface ApolloPerson {
  status?: string;
  phone_numbers?: ApolloPhoneNumber[];
}

interface ApolloWebhookPayload {
  people?: ApolloPerson[];
}

export async function POST(req: NextRequest) {
  const contactId = req.nextUrl.searchParams.get("contact_id");
  if (!contactId) return NextResponse.json({ error: "contact_id manquant" }, { status: 400 });

  let payload: ApolloWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  console.log(`[Apollo webhook] Reçu pour contact_id=${contactId}:`, JSON.stringify(payload));

  // Check the offer exists
  const offer = await prisma.jobOffer.findUnique({ where: { id: contactId } });
  if (!offer) return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });

  const person = payload?.people?.[0];

  if (!person || person.status !== "success") {
    console.log(`[Apollo webhook] Personne non trouvée ou statut invalide. person.status=${person?.status}`);
    await prisma.jobOffer.update({
      where: { id: contactId },
      data: { apolloEnrichmentStatus: "failed" },
    });
    return NextResponse.json({ ok: true });
  }

  const phoneNumbers = person.phone_numbers ?? [];
  const phone = phoneNumbers[0]?.sanitized_number ?? null;
  console.log(`[Apollo webhook] ${phoneNumbers.length} numéro(s) trouvé(s). Premier: ${phone}`);

  await prisma.jobOffer.update({
    where: { id: contactId },
    data: {
      enrichedPhone: phone ?? undefined,
      apolloEnrichmentStatus: phone ? "success" : "failed",
    },
  });

  return NextResponse.json({ ok: true });
}
