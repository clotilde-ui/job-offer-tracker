import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/workspace-access";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });

  const workspaceId = resolveWorkspaceId(session, req);
  if (!workspaceId) return NextResponse.json({ error: "Workspace requis" }, { status: 400 });

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { mantiksApiKey: true },
  });

  if (!workspace?.mantiksApiKey) {
    return NextResponse.json({ error: "Clé API Mantiks non configurée. Rendez-vous dans les Paramètres." }, { status: 400 });
  }

  const body = await req.json();
  const { job_title, job_board, job_age_in_days, job_location_ids, offset } = body;

  // Build query params for Mantiks GET request
  const params = new URLSearchParams();

  if (job_title && Array.isArray(job_title) && job_title.length > 0) {
    job_title.forEach((t: string) => params.append("job_title", t));
  }
  if (job_board) params.set("job_board", job_board);
  if (job_age_in_days) params.set("job_age_in_days", String(job_age_in_days));
  if (job_location_ids && Array.isArray(job_location_ids) && job_location_ids.length > 0) {
    job_location_ids.forEach((id: number) => params.append("job_location_ids", String(id)));
  }
  if (offset) params.set("offset", String(offset));

  const url = `https://api.mantiks.io/company/search?${params.toString()}`;

  const response = await fetch(url, {
    headers: { "x-api-key": workspace.mantiksApiKey },
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { error: `Erreur Mantiks API (${response.status})`, details: text },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
