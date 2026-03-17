import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      webhookToken: true,
      lgmApiKey: true,
      lgmCampaignId: true,
      aiProvider: true,
      claudeApiKey: true,
      geminiApiKey: true,
      groqApiKey: true,
      openaiApiKey: true,
    },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const {
    lgmApiKey,
    lgmCampaignId,
    aiProvider,
    claudeApiKey,
    geminiApiKey,
    groqApiKey,
    openaiApiKey,
  } = await req.json();

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      lgmApiKey,
      lgmCampaignId,
      aiProvider,
      claudeApiKey,
      geminiApiKey,
      groqApiKey,
      openaiApiKey,
    },
    select: {
      lgmApiKey: true,
      lgmCampaignId: true,
      aiProvider: true,
      claudeApiKey: true,
      geminiApiKey: true,
      groqApiKey: true,
      openaiApiKey: true,
    },
  });

  return NextResponse.json(user);
}
