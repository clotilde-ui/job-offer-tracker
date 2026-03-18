import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/workspace-access";

const LGM_BASE = "https://apiv2.lagrowthmachine.com";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const workspaceId = resolveWorkspaceId(session, req);
  if (!workspaceId) return NextResponse.json({ error: "Workspace requis" }, { status: 400 });

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { lgmApiKey: true },
  });

  if (!workspace?.lgmApiKey) {
    return NextResponse.json({ error: "Clé API LGM non configurée" }, { status: 422 });
  }

  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "1";
  const perPage = searchParams.get("per_page") ?? "25";
  const status = searchParams.get("status");

  const qs = new URLSearchParams({ page, per_page: perPage });
  if (status) qs.set("status", status);

  const res = await fetch(`${LGM_BASE}/inbox?${qs}`, {
    headers: { Authorization: `Bearer ${workspace.lgmApiKey}` },
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
