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
  const { toContact } = await req.json();

  const offer = await prisma.jobOffer.findFirst({
    where: { id, userId },
  });

  if (!offer) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const updated = await prisma.jobOffer.update({
    where: { id },
    data: {
      toContact,
      contactedAt: toContact ? new Date() : null,
    },
  });

  // Si coché → envoyer vers LGM
  if (toContact && !offer.lgmSent) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (user?.lgmApiKey && user?.lgmCampaignId) {
      try {
        const body = new URLSearchParams();
        body.set("audience", user.lgmCampaignId);
        if (offer.leadFirstName) body.set("firstname", offer.leadFirstName);
        if (offer.leadLastName) body.set("lastname", offer.leadLastName);
        if (offer.leadEmail) body.set("proEmail", offer.leadEmail);
        if (offer.leadPhone) body.set("phone", offer.leadPhone);
        if (offer.leadLinkedin) body.set("linkedinUrl", offer.leadLinkedin);
        if (offer.leadJobTitle) body.set("jobTitle", offer.leadJobTitle);
        if (offer.company) body.set("companyName", offer.company);
        if (offer.website) body.set("companyUrl", offer.website);

        const res = await fetch(
          `https://apiv2.lagrowthmachine.com/flow/leads?apikey=${encodeURIComponent(user.lgmApiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
          }
        );

        if (res.ok) {
          await prisma.jobOffer.update({
            where: { id },
            data: { lgmSent: true },
          });
        }
      } catch (err) {
        console.error("Erreur LGM:", err);
        // On ne bloque pas la mise à jour même si LGM échoue
      }
    }
  }

  return NextResponse.json(updated);
}
