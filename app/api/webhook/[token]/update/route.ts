import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeLinkedinUrl(url: string): string {
  return url.toLowerCase().replace(/\/+$/, "").trim();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { webhookToken: token },
    select: { id: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const leadLinkedin = body.lead_linkedin ? String(body.lead_linkedin).trim() : null;
  if (!leadLinkedin) {
    return NextResponse.json({ error: "lead_linkedin requis" }, { status: 400 });
  }

  const normalized = normalizeLinkedinUrl(leadLinkedin);

  const allOffers = await prisma.jobOffer.findMany({
    where: { workspaceId: workspace.id, leadLinkedin: { not: null } },
    select: { id: true, leadLinkedin: true },
  });

  const match = allOffers.find(
    (o) => o.leadLinkedin && normalizeLinkedinUrl(o.leadLinkedin) === normalized
  );

  if (!match) {
    return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (typeof body.call_requested === "boolean") {
    updateData.callRequested = body.call_requested;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  await prisma.jobOffer.update({
    where: { id: match.id },
    data: updateData,
  });

  return NextResponse.json({ updated: 1 }, { status: 200 });
}
