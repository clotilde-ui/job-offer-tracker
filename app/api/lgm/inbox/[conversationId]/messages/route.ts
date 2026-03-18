import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/workspace-access";

const LGM_BASE = "https://apiv2.lagrowthmachine.com";

async function getLgmApiKey(session: Session, req: NextRequest) {
  const workspaceId = resolveWorkspaceId(session, req);
  if (!workspaceId) return null;
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { lgmApiKey: true },
  });
  return workspace?.lgmApiKey ?? null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const apiKey = await getLgmApiKey(session as Session, req);
  if (!apiKey) return NextResponse.json({ error: "Clé API LGM non configurée" }, { status: 422 });

  const { conversationId } = await params;
  const res = await fetch(`${LGM_BASE}/inbox/${conversationId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json().catch(() => ({}));
  // Return the messages array from the conversation object
  return NextResponse.json(data?.messages ?? data, { status: res.status });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const apiKey = await getLgmApiKey(session as Session, req);
  if (!apiKey) return NextResponse.json({ error: "Clé API LGM non configurée" }, { status: 422 });

  const { conversationId } = await params;
  const body = await req.json();
  const res = await fetch(`${LGM_BASE}/inbox/${conversationId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
