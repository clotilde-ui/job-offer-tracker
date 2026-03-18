import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const { message } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message requis" }, { status: 400 });
  }

  const offer = await prisma.jobOffer.findUnique({ where: { id } });
  if (!offer) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (session.user.role !== "ADMIN" && offer.workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  if (!offer.leadLinkedin) {
    return NextResponse.json({ error: "Aucun profil LinkedIn pour ce lead" }, { status: 422 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: offer.workspaceId },
    select: { lgmApiKey: true, lgmIdentityId: true, lgmMemberId: true },
  });

  if (!workspace?.lgmApiKey || !workspace.lgmIdentityId || !workspace.lgmMemberId) {
    return NextResponse.json(
      { error: "Configuration LGM incomplète (clé API, Identity ID et Member ID requis dans les paramètres)" },
      { status: 422 }
    );
  }

  const res = await fetch(
    `https://apiv2.lagrowthmachine.com/flow/inbox/linkedin?apikey=${encodeURIComponent(workspace.lgmApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identityId: workspace.lgmIdentityId,
        memberId: workspace.lgmMemberId,
        linkedinUrl: offer.leadLinkedin,
        message: message.trim(),
      }),
    }
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.message ?? `Erreur LGM (${res.status})` },
      { status: res.status }
    );
  }

  return NextResponse.json({ ok: true, lead: data.lead });
}
