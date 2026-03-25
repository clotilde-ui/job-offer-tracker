import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface LgmLead {
  id: string;
  email?: string;
  email_sent?: number;
  linkedin_dm_sent?: number;
  email_opened?: number;
}

interface LgmStatsResponse {
  leads?: LgmLead[];
}

async function fetchAllCampaignLeads(apiKey: string, campaignId: string): Promise<LgmLead[]> {
  const all: LgmLead[] = [];
  let cursor: string | null = null;

  while (true) {
    const url = new URL(`https://apiv2.lagrowthmachine.com/flow/campaigns/${campaignId}/statsleads`);
    url.searchParams.set("apikey", apiKey);
    if (cursor) url.searchParams.set("getLeadsAfter", cursor);

    const res = await fetch(url.toString());
    if (!res.ok) break;

    const data: LgmStatsResponse = await res.json();
    const leads = data?.leads ?? [];
    all.push(...leads);

    if (leads.length < 25) break;
    cursor = leads[leads.length - 1].id;
  }

  return all;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "Workspace requis" }, { status: 400 });

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace?.lgmApiKey) return NextResponse.json({ error: "Clé API LGM non configurée" }, { status: 400 });

  let campaignIds: string[] = [];
  if (workspace.lgmAudiences) {
    try { campaignIds = JSON.parse(workspace.lgmAudiences); } catch {}
  }
  if (campaignIds.length === 0 && workspace.lgmCampaignId) {
    campaignIds = [workspace.lgmCampaignId];
  }
  if (campaignIds.length === 0) return NextResponse.json({ error: "Aucune campagne LGM configurée" }, { status: 400 });

  // Fetch all leads from all campaigns
  const allLeadsMap = new Map<string, LgmLead>(); // keyed by LGM lead id
  const emailMap = new Map<string, LgmLead>(); // keyed by email (fallback)

  for (const campaignId of campaignIds) {
    try {
      const leads = await fetchAllCampaignLeads(workspace.lgmApiKey, campaignId);
      for (const lead of leads) {
        allLeadsMap.set(lead.id, lead);
        if (lead.email) emailMap.set(lead.email.toLowerCase(), lead);
      }
    } catch (err) {
      console.error(`Erreur sync LGM campagne ${campaignId}:`, err);
    }
  }

  // Get all sent offers for this workspace
  const offers = await prisma.jobOffer.findMany({
    where: { workspaceId, lgmSent: true },
    select: { id: true, lgmLeadId: true, leadEmail: true },
  });

  let updated = 0;
  for (const offer of offers) {
    const lgmLead =
      (offer.lgmLeadId ? allLeadsMap.get(offer.lgmLeadId) : null) ??
      (offer.leadEmail ? emailMap.get(offer.leadEmail.toLowerCase()) : null);

    if (!lgmLead) continue;

    const messagesSent = (lgmLead.email_sent ?? 0) + (lgmLead.linkedin_dm_sent ?? 0);
    const emailOpened = lgmLead.email_opened ?? 0;

    await prisma.jobOffer.update({
      where: { id: offer.id },
      data: {
        lgmLeadId: offer.lgmLeadId ?? lgmLead.id,
        lgmMessagesSent: messagesSent,
        lgmEmailOpened: emailOpened,
      },
    });
    updated++;
  }

  return NextResponse.json({ updated, total: allLeadsMap.size });
}
