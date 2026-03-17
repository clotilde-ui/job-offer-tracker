import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ContactStatus = "qualify" | "contact" | "doNotContact";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = session.user.id;
  const { id } = await params;
  const { status, audience }: { status: ContactStatus; audience?: string } = await req.json();

  if (!["qualify", "contact", "doNotContact"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const offer = await prisma.jobOffer.findFirst({ where: { id, userId } });
  if (!offer) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const data: Record<string, unknown> = {
    toContact: status === "contact",
    doNotContact: status === "doNotContact",
    contactedAt: status === "contact" ? new Date() : null,
    lgmAudience: status === "contact" ? (audience ?? null) : null,
  };

  const updated = await prisma.jobOffer.update({ where: { id }, data });

  // Envoyer vers LGM uniquement lors du passage à "contact"
  if (status === "contact" && !offer.lgmSent) {
    const [user, customFields] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.customFieldDef.findMany({
        where: { userId, lgmAttribute: { not: null } },
      }),
    ]);

    // Resolve target audience: explicit > lgmAudiences[0] > legacy lgmCampaignId
    let targetAudience = audience ?? null;
    if (!targetAudience && user?.lgmAudiences) {
      try {
        const audiences: string[] = JSON.parse(user.lgmAudiences);
        if (audiences.length > 0) targetAudience = audiences[0];
      } catch { /* empty */ }
    }
    if (!targetAudience) targetAudience = user?.lgmCampaignId ?? null;

    if (user?.lgmApiKey && targetAudience) {
      try {
        const body = new URLSearchParams();
        body.set("audience", targetAudience);
        if (offer.leadFirstName) body.set("firstname", offer.leadFirstName);
        if (offer.leadLastName) body.set("lastname", offer.leadLastName);
        if (offer.leadEmail) body.set("proEmail", offer.leadEmail);
        if (offer.leadPhone) body.set("phone", offer.leadPhone);
        if (offer.leadLinkedin) body.set("linkedinUrl", offer.leadLinkedin);
        if (offer.leadJobTitle) body.set("jobTitle", offer.leadJobTitle);
        if (offer.company) body.set("companyName", offer.company);
        if (offer.website) body.set("companyUrl", offer.website);

        if (customFields.length > 0) {
          const customValues = JSON.parse(offer.customValues || "{}");
          for (const field of customFields) {
            const val = customValues[field.name];
            if (val != null && val !== "" && field.lgmAttribute) {
              body.set(field.lgmAttribute, String(val));
            }
          }
        }

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
      }
    }
  }

  return NextResponse.json(updated);
}
