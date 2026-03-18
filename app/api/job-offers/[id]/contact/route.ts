import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ContactStatus = "qualify" | "contact" | "doNotContact";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const { status, audience }: { status: ContactStatus; audience?: string } = await req.json();

  if (!["qualify", "contact", "doNotContact"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const offer = await prisma.jobOffer.findUnique({ where: { id } });
  if (!offer) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (session.user.role !== "ADMIN" && offer.workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const updated = await prisma.jobOffer.update({
    where: { id },
    data: {
      toContact: status === "contact",
      doNotContact: status === "doNotContact",
      contactedAt: status === "contact" ? new Date() : null,
      lgmAudience: status === "contact" ? (audience ?? null) : null,
    },
  });

  if (status === "contact" && !offer.lgmSent) {
    const [workspace, customFields] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: offer.workspaceId } }),
      prisma.customFieldDef.findMany({ where: { workspaceId: offer.workspaceId, lgmAttribute: { not: null } } }),
    ]);

    let targetAudience = audience ?? null;
    if (!targetAudience && workspace?.lgmAudiences) {
      try {
        const audiences: string[] = JSON.parse(workspace.lgmAudiences);
        if (audiences.length > 0) targetAudience = audiences[0];
      } catch {}
    }
    if (!targetAudience) targetAudience = workspace?.lgmCampaignId ?? null;

    if (workspace?.lgmApiKey && targetAudience) {
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
            if (val != null && val !== "" && field.lgmAttribute) body.set(field.lgmAttribute, String(val));
          }
        }

        const res = await fetch(`https://apiv2.lagrowthmachine.com/flow/leads?apikey=${encodeURIComponent(workspace.lgmApiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        if (res.ok) await prisma.jobOffer.update({ where: { id }, data: { lgmSent: true } });
      } catch (err) {
        console.error("Erreur LGM:", err);
      }
    }
  }

  return NextResponse.json(updated);
}
