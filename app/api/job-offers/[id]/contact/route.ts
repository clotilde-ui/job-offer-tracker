import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ContactStatus = "qualify" | "contact" | "doNotContact";

function extractEmeliaCampaignId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Accept direct campaign id
  if (/^[a-f0-9]{24}$/i.test(trimmed)) return trimmed;

  // Accept full app URL, e.g. https://app.emelia.io/advanced/<id>/settings
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/advanced\/([a-f0-9]{24})(?:\/|$)/i);
    if (match?.[1]) return match[1];
  } catch {
    // ignore parse errors
  }

  return null;
}

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
      prisma.customFieldDef.findMany({ where: { workspaceId: offer.workspaceId } }),
    ]);

    const prospectingProvider = workspace?.prospectingProvider ?? "lgm";

    let targetAudience = audience ?? null;
    let providerError: string | null = null;

    if (prospectingProvider === "emelia") {
      if (!targetAudience && workspace?.emeliaCampaigns) {
        try {
          const camps: string[] = JSON.parse(workspace.emeliaCampaigns);
          if (camps.length > 0) targetAudience = camps[0];
        } catch {}
      }

      const campaignId = targetAudience ? extractEmeliaCampaignId(targetAudience) : null;

      if (!workspace?.emeliApiKey) {
        providerError = "Clé API Emelia manquante dans les paramètres workspace.";
      } else if (!campaignId) {
        providerError = "Campagne Emelia invalide (ID attendu ou URL app.emelia.io/advanced/<id>/...).";
      } else {
        try {
          const customValues = JSON.parse(offer.customValues || "{}");
          const emeliCustom: Record<string, string> = {};
          const emeliaReservedCustomFields = new Set(["Entreprise", "Civilite", "Posteclean"]);
          for (const field of customFields) {
            if (!field.emeliAttribute) continue;
            const val = customValues[field.name];
            if (val == null || val === "") continue;
            if (emeliaReservedCustomFields.has(field.emeliAttribute)) continue;
            emeliCustom[field.emeliAttribute] = String(val);
          }

          if (offer.company) emeliCustom.Entreprise = offer.company;
          if (offer.leadCivility) emeliCustom.Civilite = offer.leadCivility;
          const postCleanValue = customValues["Post clean"];
          if (postCleanValue != null && postCleanValue !== "") emeliCustom.Posteclean = String(postCleanValue);

          const contactPayload: Record<string, unknown> = {
            ...(offer.leadFirstName && { firstName: offer.leadFirstName }),
            ...(offer.leadLastName && { lastName: offer.leadLastName }),
            ...(offer.leadEmail && { email: offer.leadEmail }),
            ...(offer.leadLinkedin && { linkedinUrlProfile: offer.leadLinkedin }),
            ...(Object.keys(emeliCustom).length > 0 && { custom: emeliCustom }),
          };

          console.log(`[Emelia] Envoi contact — campagne: ${campaignId}`);

          const res = await fetch("https://graphql.emelia.io/graphql", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": workspace.emeliApiKey,
            },
            body: JSON.stringify({
              query: `
                mutation addContactToCampaignHook($id: ID!, $contact: JSON!) {
                  addContactToCampaignHook(id: $id, contact: $contact)
                }
              `,
              variables: {
                id: campaignId,
                contact: contactPayload,
              },
            }),
          });

          if (res.ok) {
            let emeliContactId: string | undefined;
            try {
              const json = await res.json();
              if (Array.isArray(json?.errors) && json.errors.length > 0) {
                const firstError = json.errors[0]?.message;
                providerError = firstError
                  ? `Emelia: ${String(firstError)}`
                  : "Emelia a renvoyé une erreur GraphQL.";
              } else if (json?.data?.addContactToCampaignHook) {
                emeliContactId = String(json.data.addContactToCampaignHook);
              }
            } catch {}
            if (!providerError) {
              await prisma.jobOffer.update({
                where: { id },
                data: { lgmSent: true, lgmSentAt: new Date(), ...(emeliContactId ? { lgmLeadId: emeliContactId } : {}) },
              });
            }
          } else {
            const detail = await res.json().catch(() => null);
            console.error(`[Emelia] Erreur HTTP ${res.status}:`, detail);
            providerError = detail?.message
              ? `Emelia: ${String(detail.message)}`
              : `Emelia a répondu avec une erreur HTTP ${res.status}.`;
          }
        } catch (err) {
          console.error("[Emelia] Erreur de connexion:", err);
          providerError = "Erreur de connexion à Emelia.";
        }
      }
    } else {
      // Provider: lgm (default)
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
          if (offer.leadCivility) {
            const lower = offer.leadCivility.trim().toLowerCase();
            const gender = (lower === "mme" || lower === "madame") ? "woman" : "man";
            body.set("gender", gender);
          }
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

          if (res.ok) {
            let lgmLeadId: string | undefined;
            try {
              const json = await res.json();
              if (json?.id) lgmLeadId = String(json.id);
            } catch {}
            await prisma.jobOffer.update({
              where: { id },
              data: { lgmSent: true, lgmSentAt: new Date(), ...(lgmLeadId ? { lgmLeadId } : {}) },
            });
          }
        } catch (err) {
          console.error("Erreur LGM:", err);
        }
      }
    }

    if (providerError) {
      return NextResponse.json({ error: providerError }, { status: 502 });
    }
  }

  // Cascade duplicateWarning to all offers sharing the same linkedinUrl
  if (offer.leadLinkedin) {
    const normalized = offer.leadLinkedin.toLowerCase().replace(/\/+$/, "").trim();
    const candidates = await prisma.jobOffer.findMany({
      where: { workspaceId: offer.workspaceId, leadLinkedin: { not: null } },
      select: { id: true, leadLinkedin: true, toContact: true, doNotContact: true, contactedAt: true },
    });
    const group = candidates.filter(
      (o) => o.leadLinkedin && o.leadLinkedin.toLowerCase().replace(/\/+$/, "").trim() === normalized
    );
    if (group.length > 1) {
      await Promise.all(
        group.map((o) => {
          const siblings = group.filter((s) => s.id !== o.id);
          let warning: string | null = null;
          if (siblings.some((s) => s.doNotContact)) warning = "do_not_contact";
          else if (siblings.some((s) => s.toContact || s.contactedAt)) warning = "contacted";
          else warning = "imported";
          return prisma.jobOffer.update({ where: { id: o.id }, data: { duplicateWarning: warning } });
        })
      );
    }
  }

  return NextResponse.json(updated);
}
