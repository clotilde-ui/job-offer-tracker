import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  const requestedUserId = new URL(req.url).searchParams.get("userId");
  const targetUserId = isAdmin && requestedUserId ? requestedUserId : session.user.id;

  if (!isAdmin && targetUserId !== session.user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      webhookToken: true,
      lgmApiKey: true,
      lgmCampaignId: true,
      lgmAudiences: true,
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

  const isAdmin = session.user.role === "ADMIN";
  const requestedUserId = new URL(req.url).searchParams.get("userId");
  const targetUserId = isAdmin && requestedUserId ? requestedUserId : session.user.id;

  if (!isAdmin && targetUserId !== session.user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const {
    lgmApiKey,
    lgmAudiences,
    aiProvider,
    claudeApiKey,
    geminiApiKey,
    groqApiKey,
    openaiApiKey,
  } = await req.json();

  const user = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      lgmApiKey,
      lgmAudiences: Array.isArray(lgmAudiences) ? JSON.stringify(lgmAudiences) : lgmAudiences,
      aiProvider,
      claudeApiKey,
      geminiApiKey,
      groqApiKey,
      openaiApiKey,
    },
    select: {
      lgmApiKey: true,
      lgmAudiences: true,
      aiProvider: true,
      claudeApiKey: true,
      geminiApiKey: true,
      groqApiKey: true,
      openaiApiKey: true,
    },
  });

  return NextResponse.json(user);
}
